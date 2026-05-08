import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StockRelevanceService } from './stock-relevance.service';
import { QueueService, QUEUES } from '../queue/queue.service';

interface NormalizedArticle {
  headline: string;
  summary: string | null;
  content: string | null;
  sourceName: string;
  sourceUrl: string;
  imageUrl: string | null;
  publishedAt: Date;
  hash: string;
}

@Injectable()
export class NewsIngestionService {
  private readonly logger = new Logger(NewsIngestionService.name);
  private readonly finnhubKey: string;
  private readonly newsApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly stockRelevance: StockRelevanceService,
    private readonly queueService: QueueService,
  ) {
    this.finnhubKey = this.config.get<string>('FINNHUB_API_KEY', '');
    this.newsApiKey = this.config.get<string>('NEWS_API_KEY', '');
  }

  async fetchNewsForStock(symbol: string): Promise<number> {
    let ingested = 0;

    if (this.finnhubKey) {
      ingested += await this.fetchFromFinnhub(symbol);
    }

    if (this.newsApiKey) {
      ingested += await this.fetchFromNewsApi(symbol);
    }

    return ingested;
  }

  async fetchBroadMarketNews(): Promise<number> {
    if (!this.newsApiKey) {
      this.logger.warn('NEWS_API_KEY not configured, skipping broad market news');
      return 0;
    }

    try {
      const { data } = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: 'stock market OR BSE OR NSE OR Sensex OR Nifty',
          sortBy: 'publishedAt',
          language: 'en',
          pageSize: 50,
          apiKey: this.newsApiKey,
        },
        timeout: 15_000,
      });

      const articles = this.normalizeNewsApiArticles(data.articles ?? []);
      return this.storeArticles(articles);
    } catch (error) {
      this.logger.error('Failed to fetch broad market news from NewsAPI', error);
      return 0;
    }
  }

  private async fetchFromFinnhub(symbol: string): Promise<number> {
    try {
      const to = new Date();
      const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);

      const { data } = await axios.get(
        'https://finnhub.io/api/v1/company-news',
        {
          params: {
            symbol,
            from: this.formatDate(from),
            to: this.formatDate(to),
            token: this.finnhubKey,
          },
          timeout: 10_000,
        },
      );

      if (!Array.isArray(data)) return 0;

      const articles = this.normalizeFinnhubArticles(data);
      this.logger.debug(
        `Finnhub returned ${data.length} articles for ${symbol}`,
      );

      return this.storeArticles(articles);
    } catch (error) {
      this.logger.error(
        `Failed to fetch Finnhub news for ${symbol}`,
        error instanceof Error ? error.message : error,
      );
      return 0;
    }
  }

  private async fetchFromNewsApi(symbol: string): Promise<number> {
    try {
      const { data } = await axios.get(
        'https://newsapi.org/v2/everything',
        {
          params: {
            q: symbol,
            sortBy: 'publishedAt',
            language: 'en',
            pageSize: 20,
            apiKey: this.newsApiKey,
          },
          timeout: 10_000,
        },
      );

      const articles = this.normalizeNewsApiArticles(data.articles ?? []);
      this.logger.debug(
        `NewsAPI returned ${(data.articles ?? []).length} articles for ${symbol}`,
      );

      return this.storeArticles(articles);
    } catch (error) {
      this.logger.error(
        `Failed to fetch NewsAPI news for ${symbol}`,
        error instanceof Error ? error.message : error,
      );
      return 0;
    }
  }

  private async storeArticles(articles: NormalizedArticle[]): Promise<number> {
    let stored = 0;

    for (const article of articles) {
      try {
        const exists = await this.prisma.newsArticle.findUnique({
          where: { hash: article.hash },
          select: { id: true },
        });

        if (exists) continue;

        const created = await this.prisma.newsArticle.create({
          data: article,
        });

        stored++;

        await this.stockRelevance.mapArticleToStocks(created.id);
        await this.queueService.publish(QUEUES.NEWS_ANALYSIS, {
          articleId: created.id,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to store article: ${article.headline.slice(0, 60)}`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    return stored;
  }

  private normalizeFinnhubArticles(raw: any[]): NormalizedArticle[] {
    return raw
      .filter((a) => a.headline && a.url)
      .map((a) => ({
        headline: String(a.headline).trim(),
        summary: a.summary ? String(a.summary).trim() : null,
        content: null,
        sourceName: a.source ? String(a.source) : 'Finnhub',
        sourceUrl: String(a.url),
        imageUrl: a.image ? String(a.image) : null,
        publishedAt: new Date(a.datetime * 1000),
        hash: this.generateHash(a.headline, a.source ?? 'Finnhub'),
      }));
  }

  private normalizeNewsApiArticles(raw: any[]): NormalizedArticle[] {
    return raw
      .filter((a) => a.title && a.url)
      .map((a) => ({
        headline: String(a.title).trim(),
        summary: a.description ? String(a.description).trim() : null,
        content: a.content ? String(a.content).trim() : null,
        sourceName: a.source?.name ? String(a.source.name) : 'NewsAPI',
        sourceUrl: String(a.url),
        imageUrl: a.urlToImage ? String(a.urlToImage) : null,
        publishedAt: a.publishedAt ? new Date(a.publishedAt) : new Date(),
        hash: this.generateHash(a.title, a.source?.name ?? 'NewsAPI'),
      }));
  }

  private generateHash(headline: string, sourceName: string): string {
    const normalized = `${headline.trim().toLowerCase()}|${sourceName.trim().toLowerCase()}`;
    return createHash('sha256').update(normalized).digest('hex');
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
