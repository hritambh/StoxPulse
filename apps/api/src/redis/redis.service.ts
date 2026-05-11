import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.get<string>('REDIS_URL');

    if (redisUrl) {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 200, 5000),
        tls: redisUrl.startsWith('rediss://') ? {} : undefined,
      });
    } else {
      this.client = new Redis({
        host: this.config.get('REDIS_HOST', 'localhost'),
        port: this.config.get('REDIS_PORT', 6379),
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 200, 5000),
      });
    }

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err) => this.logger.error('Redis error', err));
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
