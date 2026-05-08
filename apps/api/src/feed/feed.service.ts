import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { FeedRankingService } from './feed-ranking.service';

const FEED_CACHE_TTL = 120;

@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly feedRanking: FeedRankingService,
  ) {}

  async getUserFeed(userId: string, cursor?: string, limit: number = 20) {
    const cacheKey = `feed:user:${userId}:page:${cursor || 'first'}:${limit}`;

    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const feedItems = await this.prisma.userFeed.findMany({
      where: {
        userId,
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { rankingScore: 'desc' },
      take: limit + 1,
      include: {
        article: {
          include: {
            analysis: true,
            stockLinks: {
              include: {
                stock: {
                  select: {
                    id: true,
                    symbol: true,
                    name: true,
                    logoUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const hasMore = feedItems.length > limit;
    const items = hasMore ? feedItems.slice(0, limit) : feedItems;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const mapped = items.map((item) => ({
      id: item.article.id,
      headline: item.article.headline,
      summary: item.article.summary,
      sourceName: item.article.sourceName,
      sourceUrl: item.article.sourceUrl,
      imageUrl: item.article.imageUrl,
      publishedAt: item.article.publishedAt,
      rankingScore: item.rankingScore,
      analysis: item.article.analysis
        ? {
            sentiment: item.article.analysis.sentiment,
            confidence: item.article.analysis.confidence,
            aiSummary: item.article.analysis.aiSummary,
            reasoning: item.article.analysis.reasoning,
            impactScore: item.article.analysis.impactScore,
          }
        : null,
      stocks: item.article.stockLinks.map((link) => ({
        id: link.stock.id,
        symbol: link.stock.symbol,
        name: link.stock.name,
        logoUrl: link.stock.logoUrl,
      })),
    }));

    const result = { items: mapped, nextCursor };

    await this.redis.setJson(cacheKey, result, FEED_CACHE_TTL);

    return result;
  }

  async getArticleDetail(articleId: string) {
    const article = await this.prisma.newsArticle.findUnique({
      where: { id: articleId },
      include: {
        analysis: true,
        stockLinks: {
          include: {
            stock: {
              select: {
                id: true,
                symbol: true,
                name: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!article) {
      throw new NotFoundException(`Article ${articleId} not found`);
    }

    return {
      id: article.id,
      headline: article.headline,
      summary: article.summary,
      content: article.content,
      sourceName: article.sourceName,
      sourceUrl: article.sourceUrl,
      imageUrl: article.imageUrl,
      publishedAt: article.publishedAt,
      analysis: article.analysis
        ? {
            sentiment: article.analysis.sentiment,
            confidence: article.analysis.confidence,
            aiSummary: article.analysis.aiSummary,
            reasoning: article.analysis.reasoning,
            impactScore: article.analysis.impactScore,
          }
        : null,
      stocks: article.stockLinks.map((link) => ({
        id: link.stock.id,
        symbol: link.stock.symbol,
        name: link.stock.name,
        logoUrl: link.stock.logoUrl,
      })),
    };
  }

  async markSeen(userId: string, articleId: string): Promise<void> {
    await this.prisma.userFeed.updateMany({
      where: { userId, articleId },
      data: { seen: true },
    });
  }

  async buildFeedForUser(userId: string): Promise<void> {
    const watchlist = await this.prisma.watchlist.findMany({
      where: { userId },
      select: { stockId: true },
    });

    if (watchlist.length === 0) return;

    const stockIds = watchlist.map((w) => w.stockId);
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const articles = await this.prisma.newsArticle.findMany({
      where: {
        publishedAt: { gte: cutoff },
        analysis: { isNot: null },
        stockLinks: { some: { stockId: { in: stockIds } } },
      },
      include: {
        analysis: true,
        stockLinks: {
          where: { stockId: { in: stockIds } },
          select: { relevanceScore: true },
        },
      },
    });

    for (const article of articles) {
      const analysis = article.analysis!;
      const maxRelevance = Math.max(
        ...article.stockLinks.map((l) => l.relevanceScore),
      );

      const rankingScore = this.feedRanking.calculateRankingScore(
        maxRelevance,
        analysis.impactScore,
        analysis.confidence,
        article.publishedAt,
      );

      await this.prisma.userFeed.upsert({
        where: {
          userId_articleId: { userId, articleId: article.id },
        },
        create: {
          userId,
          articleId: article.id,
          rankingScore,
        },
        update: { rankingScore },
      });
    }

    await this.redis.delPattern(`feed:user:${userId}:*`);
    this.logger.log(
      `Feed rebuilt for user ${userId}: ${articles.length} articles scored`,
    );
  }
}
