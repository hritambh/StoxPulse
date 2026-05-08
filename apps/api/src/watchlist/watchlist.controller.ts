import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { WatchlistService } from './watchlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

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
  @ApiQuery({ name: 'token', required: true, description: 'Angel One symbol token' })
  @ApiQuery({ name: 'exchange', required: false, description: 'NSE or BSE (default: NSE)' })
  addStock(
    @CurrentUser() user: JwtPayload,
    @Param('symbol') symbol: string,
    @Query('token') token: string,
    @Query('exchange') exchange?: string,
  ) {
    return this.watchlistService.addStock(
      user.sub,
      symbol,
      token,
      exchange || 'NSE',
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
