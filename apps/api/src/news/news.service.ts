import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByArticleId(id: string) {
    const article = await this.prisma.newsArticle.findUnique({
      where: { id },
      include: {
        stockLinks: { include: { stock: true } },
        analysis: true,
      },
    });

    if (!article) {
      throw new NotFoundException(`Article ${id} not found`);
    }

    return article;
  }

  async findRecentForStock(stockId: string, limit = 20) {
    return this.prisma.newsArticle.findMany({
      where: {
        stockLinks: { some: { stockId } },
      },
      include: {
        stockLinks: true,
        analysis: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  }

  async findRecent(limit = 50) {
    return this.prisma.newsArticle.findMany({
      include: {
        stockLinks: { include: { stock: true } },
        analysis: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  }

  async existsByHash(hash: string): Promise<boolean> {
    const count = await this.prisma.newsArticle.count({ where: { hash } });
    return count > 0;
  }
}
