import { Module } from '@nestjs/common';
import { FeedService } from './feed.service';
import { FeedRankingService } from './feed-ranking.service';
import { FeedWorker } from './feed.worker';
import { FeedController } from './feed.controller';

@Module({
  controllers: [FeedController],
  providers: [FeedService, FeedRankingService, FeedWorker],
  exports: [FeedService],
})
export class FeedModule {}
