import { Injectable, Logger } from '@nestjs/common';
import Expo, { ExpoPushMessage } from 'expo-server-sdk';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly expo = new Expo();

  constructor(private readonly prisma: PrismaService) {}

  async sendStockDropAlert(
    userId: string,
    stockSymbol: string,
    stockName: string,
    dropPct: number,
  ) {
    const title = 'Stock Alert';
    const body = `${stockSymbol} (${stockName}) from your watchlist dropped by ${Math.abs(dropPct).toFixed(1)}% today`;

    await this.sendPushAndSave(userId, title, body, 'price_drop', {
      symbol: stockSymbol,
      changePct: dropPct,
    });
  }

  async sendSentimentAlert(
    userId: string,
    articleId: string,
    stockSymbol: string,
    sentiment: string,
    impactScore: number,
  ) {
    const title = 'Sentiment Alert';
    const body = `${stockSymbol}: ${sentiment} sentiment detected (impact: ${impactScore})`;

    await this.sendPushAndSave(userId, title, body, 'sentiment_alert', {
      articleId,
      symbol: stockSymbol,
      sentiment,
      impactScore,
    });
  }

  async sendEarningsAlert(
    userId: string,
    stockSymbol: string,
    headline: string,
  ) {
    const title = 'Earnings Alert';
    const body = `${stockSymbol}: ${headline}`;

    await this.sendPushAndSave(userId, title, body, 'earnings_alert', {
      symbol: stockSymbol,
      headline,
    });
  }

  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  private async sendPushAndSave(
    userId: string,
    title: string,
    body: string,
    type: string,
    metadata: Record<string, any>,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    });

    if (user?.pushToken && Expo.isExpoPushToken(user.pushToken)) {
      const message: ExpoPushMessage = {
        to: user.pushToken,
        sound: 'default',
        title,
        body,
        data: metadata,
      };

      try {
        const [ticket] = await this.expo.sendPushNotificationsAsync([message]);
        this.logger.log(
          `Push sent to ${userId}: ${JSON.stringify(ticket)}`,
        );
      } catch (err) {
        this.logger.error(`Failed to send push to ${userId}: ${err}`);
      }
    } else {
      this.logger.warn(`No valid push token for user ${userId}`);
    }

    try {
      await this.prisma.notification.create({
        data: { userId, title, body, type, metadata: metadata as any },
      });
    } catch (err) {
      this.logger.error(`Failed to persist notification for user ${userId}: ${err}`);
    }
  }
}
