import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import type { ConfirmChannel } from 'amqplib';

export const QUEUES = {
  NEWS_ANALYSIS: 'news-analysis-queue',
  FEED_BUILD: 'feed-build-queue',
  NOTIFICATION: 'notification-queue',
} as const;

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private connection!: amqp.AmqpConnectionManager;
  private channel!: amqp.ChannelWrapper;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get('RABBITMQ_URL', 'amqp://localhost:5672');

    this.connection = amqp.connect([url]);
    this.connection.on('connect', () => this.logger.log('RabbitMQ connected'));
    this.connection.on('disconnect', (err) =>
      this.logger.warn('RabbitMQ disconnected', err?.err?.message),
    );

    this.channel = this.connection.createChannel({
      setup: async (ch: ConfirmChannel) => {
        await Promise.all(
          Object.values(QUEUES).map((q) =>
            ch.assertQueue(q, { durable: true }),
          ),
        );
      },
    });

    await this.channel.waitForConnect();
    this.logger.log('RabbitMQ channel ready');
  }

  async publish(queue: string, data: unknown): Promise<void> {
    await this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), {
      persistent: true,
    });
  }

  async consume(
    queue: string,
    handler: (data: any) => Promise<void>,
    prefetch = 5,
  ): Promise<void> {
    await this.channel.addSetup(async (ch: ConfirmChannel) => {
      await ch.prefetch(prefetch);
      await ch.consume(queue, async (msg) => {
        if (!msg) return;
        try {
          const data = JSON.parse(msg.content.toString());
          await handler(data);
          ch.ack(msg);
        } catch (err) {
          this.logger.error(`Error processing message from ${queue}`, err);
          ch.nack(msg, false, false);
        }
      });
    });
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
  }
}
