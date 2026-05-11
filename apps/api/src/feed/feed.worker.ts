import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService, QUEUES } from '../queue/queue.service';
import { FeedService } from './feed.service';

@Injectable()
export class FeedWorker implements OnModuleInit {
  private readonly logger = new Logger(FeedWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly prisma: PrismaService,
    private readonly feedService: FeedService,
  ) {}

  async onModuleInit() {
    await this.queueService.consume(QUEUES.FEED_BUILD, async (data) => {
      const { articleId } = data;
      this.logger.log(`Building feeds for article ${articleId}`);

      const linked = await this.prisma.articleStockRelation.count({
        where: { articleId },
      });
      this.logger.debug(`Article ${articleId} has ${linked} stock links`);

      const articleStocks = await this.prisma.articleStockRelation.findMany({
        where: { articleId },
        select: { stockId: true },
      });

      if (articleStocks.length === 0) {
        this.logger.warn(`No stocks linked to article ${articleId}`);
        return;
      }

      const stockIds = articleStocks.map((as) => as.stockId);

      const watchers = await this.prisma.watchlist.findMany({
        where: { stockId: { in: stockIds } },
        select: { userId: true },
      });

      const uniqueUserIds = [...new Set(watchers.map((w) => w.userId))];

      this.logger.log(
        `Rebuilding feed for ${uniqueUserIds.length} users watching ${stockIds.length} stocks`,
      );

      for (const userId of uniqueUserIds) {
        try {
          await this.feedService.buildFeedForUser(userId);
        } catch (err) {
          this.logger.error(`Failed to build feed for user ${userId}: ${err}`);
        }
      }
    });

    this.logger.log('Feed worker started consuming from feed-build-queue');
  }
}
