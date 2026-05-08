import { Module } from '@nestjs/common';
import { AiAnalysisService } from './ai-analysis.service';
import { AiAnalysisWorker } from './ai-analysis.worker';

@Module({
  providers: [AiAnalysisService, AiAnalysisWorker],
  exports: [AiAnalysisService],
})
export class AiAnalysisModule {}
