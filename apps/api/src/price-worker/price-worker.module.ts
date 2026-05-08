import { Module } from '@nestjs/common';
import { PriceWorkerService } from './price-worker.service';
import { StockModule } from '../stock/stock.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [StockModule, NotificationModule],
  providers: [PriceWorkerService],
})
export class PriceWorkerModule {}
