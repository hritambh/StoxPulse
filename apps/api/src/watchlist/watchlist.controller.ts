import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WatchlistService } from './watchlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { AddStockDto } from './dto/add-stock.dto';

@ApiTags('Watchlist')
@ApiBearerAuth()
@Controller('watchlist')
@UseGuards(JwtAuthGuard)
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  getWatchlist(@CurrentUser() user: JwtPayload) {
    return this.watchlistService.getWatchlist(user.sub);
  }

  @Post('refresh')
  refreshPrices(@CurrentUser() user: JwtPayload) {
    return this.watchlistService.refreshPrices(user.sub);
  }

  @Post(':symbol')
  addStock(
    @CurrentUser() user: JwtPayload,
    @Param('symbol') symbol: string,
    @Body() dto: AddStockDto,
  ) {
    return this.watchlistService.addStock(
      user.sub,
      symbol,
      dto.token,
      dto.exchange || 'NSE',
      dto.name,
    );
  }

  @Delete(':symbol')
  removeStock(
    @CurrentUser() user: JwtPayload,
    @Param('symbol') symbol: string,
  ) {
    return this.watchlistService.removeStock(user.sub, symbol);
  }
}
