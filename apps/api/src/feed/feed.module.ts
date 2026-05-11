import { Module } from '@nestjs/common';
import { NewsModule } from '../news/news.module';
import { FeedService } from './feed.service';
import { FeedRankingService } from './feed-ranking.service';
import { FeedWorker } from './feed.worker';
import { FeedController } from './feed.controller';

@Module({
  imports: [NewsModule],
  controllers: [FeedController],
  providers: [FeedService, FeedRankingService, FeedWorker],
  exports: [FeedService],
})
export class FeedModule {}
