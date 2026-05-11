import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NewsIngestionService } from './news-ingestion.service';

@Injectable()
export class NewsCronService {
  private readonly logger = new Logger(NewsCronService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly newsIngestion: NewsIngestionService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleNewsFetch() {
    if (this.running) {
      this.logger.warn('Previous news fetch cycle still running, skipping');
      return;
    }

    this.running = true;
    this.logger.log('Starting news ingestion cycle');

    try {
      const stocks = await this.prisma.stock.findMany({
        where: {
          watchers: { some: {} },
        },
        select: { id: true, symbol: true, name: true, aliases: true },
      });

      this.logger.log(`Found ${stocks.length} watched stock(s) for news fetch`);

      let totalIngested = 0;

      for (const stock of stocks) {
        try {
          const aliases = Array.isArray(stock.aliases) ? stock.aliases as string[] : [];
          const count = await this.newsIngestion.fetchNewsForStock({
            symbol: stock.symbol,
            name: stock.name,
            aliases,
          });
          totalIngested += count;
          this.logger.debug(
            `Fetched ${count} new article(s) for ${stock.symbol}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed fetching news for ${stock.symbol}`,
            error instanceof Error ? error.message : error,
          );
        }
      }

      const broadCount = await this.newsIngestion.fetchBroadMarketNews();
      totalIngested += broadCount;

      this.logger.log(
        `News ingestion cycle complete: ${totalIngested} new article(s) stored`,
      );
    } catch (error) {
      this.logger.error('News ingestion cycle failed', error);
    } finally {
      this.running = false;
    }
  }
}
