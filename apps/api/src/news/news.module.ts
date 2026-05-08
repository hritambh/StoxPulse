import { Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsIngestionService } from './news-ingestion.service';
import { StockRelevanceService } from './stock-relevance.service';
import { NewsCronService } from './news-cron.service';

@Module({
  providers: [
    NewsService,
    NewsIngestionService,
    StockRelevanceService,
    NewsCronService,
  ],
  exports: [NewsService, NewsIngestionService],
})
export class NewsModule {}
