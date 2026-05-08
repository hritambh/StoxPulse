import { Global, Module } from '@nestjs/common';
import { AngelOneService } from './angel-one.service';

@Global()
@Module({
  providers: [AngelOneService],
  exports: [AngelOneService],
})
export class AngelOneModule {}
