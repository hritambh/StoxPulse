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

interface StockInfo {
  symbol: string;
  name: string;
  aliases: string[];
}

@Injectable()
export class NewsIngestionService {
  private readonly logger = new Logger(NewsIngestionService.name);
  private readonly newsApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly stockRelevance: StockRelevanceService,
    private readonly queueService: QueueService,
  ) {
    this.newsApiKey = this.config.get<string>('NEWS_API_KEY', '');
  }

  async fetchNewsForStock(stock: StockInfo): Promise<number> {
    if (!this.newsApiKey) {
      this.logger.warn('NEWS_API_KEY not configured, skipping stock news');
      return 0;
    }

    const query = this.buildStockQuery(stock);
    return this.fetchFromNewsApi(query, stock.symbol, stock);
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

  /**
   * Build an OR-joined query from the stock's name and aliases
   * so NewsAPI returns more relevant results for Indian stocks.
   * e.g. "Reliance Industries" OR "RIL" OR "Mukesh Ambani company"
   */
  private buildStockQuery(stock: StockInfo): string {
    const terms: string[] = [];

    terms.push(`"${stock.name}"`);

    if (stock.symbol.length >= 3) {
      terms.push(stock.symbol);
    }

    const aliases = this.parseAliases(stock.aliases);
    for (const alias of aliases.slice(0, 3)) {
      if (alias.length >= 3 && alias !== stock.symbol && alias !== stock.name) {
        terms.push(`"${alias}"`);
      }
    }

    return terms.join(' OR ');
  }

  private async fetchFromNewsApi(
    query: string,
    symbol: string,
    forStock?: StockInfo,
  ): Promise<number> {
    try {
      const url = 'https://newsapi.org/v2/everything';
      const params = {
        q: query,
        sortBy: 'publishedAt',
        language: 'en',
        pageSize: 30,
        apiKey: this.newsApiKey,
      };

      const { data } = await axios.get(url, {
        params,
        timeout: 10_000,
      });

      const articles = this.normalizeNewsApiArticles(data.articles ?? []);
      this.logger.log(
        `NewsAPI returned ${(data.articles ?? []).length} articles for ${symbol}`,
      );

      return this.storeArticles(articles, forStock);
    } catch (error) {
      this.logger.error(
        `Failed to fetch NewsAPI news for ${symbol}`,
        error instanceof Error ? error.message : error,
      );
      return 0;
    }
  }

  private async storeArticles(
    articles: NormalizedArticle[],
    forStock?: StockInfo,
  ): Promise<number> {
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

        if (forStock) {
          await this.forceLink(created.id, forStock.symbol);
        }
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

  private async forceLink(articleId: string, symbol: string): Promise<void> {
    const stock = await this.prisma.stock.findUnique({
      where: { symbol: symbol.toUpperCase() },
      select: { id: true },
    });
    if (!stock) return;

    await this.prisma.articleStockRelation.upsert({
      where: {
        articleId_stockId: { articleId, stockId: stock.id },
      },
      create: { articleId, stockId: stock.id, relevanceScore: 10 },
      update: {},
    });
  }

  private normalizeNewsApiArticles(raw: any[]): NormalizedArticle[] {
    return raw
      .filter((a) => a.title && a.url && a.title !== '[Removed]')
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

  private parseAliases(aliases: unknown): string[] {
    if (Array.isArray(aliases)) return aliases.filter((a) => typeof a === 'string');
    if (typeof aliases === 'string') {
      try {
        const parsed = JSON.parse(aliases);
        return Array.isArray(parsed) ? parsed.filter((a: unknown) => typeof a === 'string') : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}
