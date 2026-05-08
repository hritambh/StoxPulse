import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Stocks')
@ApiBearerAuth()
@Controller('stocks')
@UseGuards(JwtAuthGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('search')
  @ApiQuery({ name: 'q', required: true, description: 'Stock symbol or name' })
  @ApiQuery({ name: 'exchange', required: false, description: 'NSE or BSE (default: NSE)' })
  search(
    @Query('q') query: string,
    @Query('exchange') exchange?: string,
  ) {
    return this.stockService.search(query || '', exchange || 'NSE');
  }

  @Get(':symbol/quote')
  @ApiQuery({ name: 'token', required: true, description: 'Angel One symbol token' })
  @ApiQuery({ name: 'exchange', required: false, description: 'NSE or BSE (default: NSE)' })
  getQuote(
    @Param('symbol') symbol: string,
    @Query('token') token: string,
    @Query('exchange') exchange?: string,
  ) {
    return this.stockService.getQuote(
      symbol.toUpperCase(),
      token,
      exchange || 'NSE',
    );
  }
}
