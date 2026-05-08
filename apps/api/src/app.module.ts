import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { QueueModule } from './queue/queue.module';
import { AngelOneModule } from './angel-one/angel-one.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { StockModule } from './stock/stock.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { NotificationModule } from './notification/notification.module';
import { PriceWorkerModule } from './price-worker/price-worker.module';
import { NewsModule } from './news/news.module';
import { AiAnalysisModule } from './ai-analysis/ai-analysis.module';
import { FeedModule } from './feed/feed.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    QueueModule,
    AngelOneModule,
    AuthModule,
    UserModule,
    StockModule,
    WatchlistModule,
    NotificationModule,
    PriceWorkerModule,
    NewsModule,
    AiAnalysisModule,
    FeedModule,
  ],
})
export class AppModule {}
