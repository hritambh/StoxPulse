import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService, QUEUES } from '../queue/queue.service';
import { AiAnalysisService } from './ai-analysis.service';

@Injectable()
export class AiAnalysisWorker implements OnModuleInit {
  private readonly logger = new Logger(AiAnalysisWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly aiAnalysisService: AiAnalysisService,
  ) {}

  async onModuleInit() {
    await this.queueService.consume(
      QUEUES.NEWS_ANALYSIS,
      async (data) => {
        const { articleId } = data;
        this.logger.log(`Processing analysis for article ${articleId}`);

        const analysis =
          await this.aiAnalysisService.analyzeArticle(articleId);

        if (analysis) {
          await this.queueService.publish(QUEUES.FEED_BUILD, { articleId });
          this.logger.log(`Feed build queued for article ${articleId}`);
        }
      },
      10,
    );

    this.logger.log('AI Analysis worker started consuming from news-analysis-queue');
  }
}
