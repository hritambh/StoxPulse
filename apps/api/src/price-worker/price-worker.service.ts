import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { NotificationService } from '../notification/notification.service';

const DROP_THRESHOLD_PCT = -1;

@Injectable()
export class PriceWorkerService {
  private readonly logger = new Logger(PriceWorkerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handlePriceFetch() {
    this.logger.log('Starting price fetch cycle...');

    const watchedStocks = await this.prisma.stock.findMany({
      where: { watchers: { some: {} }, symbolToken: { not: null } },
      select: { symbol: true, symbolToken: true, exchange: true },
    });

    if (watchedStocks.length === 0) {
      this.logger.log('No watched stocks, skipping.');
      return;
    }

    const stocks = watchedStocks.map((s) => ({
      symbol: s.symbol,
      token: s.symbolToken!,
      exchange: s.exchange,
    }));

    this.logger.log(`Fetching prices for ${stocks.length} stocks`);

    const quotes = await this.stockService.fetchAndStorePrices(stocks);

    const droppedStocks = quotes.filter((q) => q.dayChangePct <= DROP_THRESHOLD_PCT);

    if (droppedStocks.length === 0) {
      this.logger.log('No stocks below threshold.');
      return;
    }

    this.logger.log(
      `${droppedStocks.length} stocks below ${DROP_THRESHOLD_PCT}% threshold`,
    );

    for (const dropped of droppedStocks) {
      await this.notifyWatchers(dropped.symbol, dropped.name, dropped.dayChangePct);
    }
  }

  private async notifyWatchers(symbol: string, name: string, changePct: number) {
    const stock = await this.prisma.stock.findUnique({
      where: { symbol },
      include: {
        watchers: {
          include: { user: { select: { id: true, pushToken: true } } },
        },
      },
    });

    if (!stock) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const watcher of stock.watchers) {
      const alreadySent = await this.prisma.notification.findFirst({
        where: {
          userId: watcher.userId,
          type: 'price_drop',
          createdAt: { gte: today },
          metadata: {
            path: ['symbol'],
            equals: symbol,
          },
        },
      });

      if (alreadySent) continue;

      await this.notificationService.sendStockDropAlert(
        watcher.userId,
        symbol,
        name,
        changePct,
      );
    }
  }
}
