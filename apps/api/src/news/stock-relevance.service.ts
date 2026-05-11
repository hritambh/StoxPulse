import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface StockMatch {
  stockId: string;
  relevanceScore: number;
}

interface MatchTarget {
  id: string;
  symbol: string;
  name: string;
  aliases: string[];
}

@Injectable()
export class StockRelevanceService {
  private readonly logger = new Logger(StockRelevanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async mapArticleToStocks(articleId: string): Promise<StockMatch[]> {
    const article = await this.prisma.newsArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      this.logger.warn(`Article ${articleId} not found for relevance mapping`);
      return [];
    }

    const stocks = await this.prisma.stock.findMany();

    const targets: MatchTarget[] = stocks.map((stock) => ({
      id: stock.id,
      symbol: stock.symbol,
      name: stock.name,
      aliases: this.parseAliases(stock.aliases),
    }));

    const headline = (article.headline ?? '').toLowerCase();
    const body = [article.summary, article.content]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matches: StockMatch[] = [];

    for (const target of targets) {
      const score = this.calculateScore(target, headline, body);

      if (score >= 2) {
        matches.push({ stockId: target.id, relevanceScore: score });
      }
    }

    if (matches.length > 0) {
      await this.prisma.articleStockRelation.createMany({
        data: matches.map((m) => ({
          articleId,
          stockId: m.stockId,
          relevanceScore: m.relevanceScore,
        })),
        skipDuplicates: true,
      });

      this.logger.debug(
        `Mapped article ${articleId} to ${matches.length} stock(s)`,
      );
    }

    return matches;
  }

  private calculateScore(
    target: MatchTarget,
    headline: string,
    body: string,
  ): number {
    let score = 0;
    const symbol = target.symbol.toLowerCase();
    const name = target.name.toLowerCase();

    if (this.containsWord(headline, symbol)) score += 10;
    if (headline.includes(name)) score += 8;
    for (const alias of target.aliases) {
      if (headline.includes(alias.toLowerCase())) {
        score += 5;
        break;
      }
    }

    if (this.containsWord(body, symbol)) score += 4;
    if (body.includes(name)) score += 3;
    for (const alias of target.aliases) {
      if (body.includes(alias.toLowerCase())) {
        score += 2;
        break;
      }
    }

    return score;
  }

  /** Word-boundary match to avoid partial ticker matches (e.g. "A" inside "Apple") */
  private containsWord(text: string, word: string): boolean {
    const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'i');
    return regex.test(text);
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
