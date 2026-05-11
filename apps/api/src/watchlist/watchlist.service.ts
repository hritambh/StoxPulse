import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';

@Injectable()
export class WatchlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
  ) {}

  async getWatchlist(userId: string) {
    const items = await this.prisma.watchlist.findMany({
      where: { userId },
      include: {
        stock: {
          include: {
            prices: {
              orderBy: { fetchedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });

    return items.map((item) => {
      const latestPrice = item.stock.prices[0];
      return {
        id: item.id,
        addedAt: item.addedAt,
        stock: {
          symbol: item.stock.symbol,
          name: item.stock.name,
          token: item.stock.symbolToken,
          exchange: item.stock.exchange,
          currentPrice: latestPrice?.current ?? null,
          dayChangePct: latestPrice?.dayChangePct ?? null,
        },
      };
    });
  }

  async addStock(
    userId: string,
    symbol: string,
    token: string,
    exchange = 'NSE',
    searchName?: string,
  ) {
    const upperSymbol = symbol.toUpperCase();

    const quote = await this.stockService.getQuote(upperSymbol, token, exchange);
    const bestName = searchName || quote.name;
    const aliases = await this.stockService.generateAliases(upperSymbol, bestName);

    const stock = await this.prisma.stock.upsert({
      where: { symbol: upperSymbol },
      create: {
        symbol: upperSymbol,
        name: bestName,
        exchange,
        symbolToken: token,
        aliases,
      },
      update: { name: bestName, symbolToken: token, aliases },
    });

    const existing = await this.prisma.watchlist.findUnique({
      where: { userId_stockId: { userId, stockId: stock.id } },
    });

    if (existing) {
      throw new ConflictException('Stock already in watchlist');
    }

    await this.prisma.watchlist.create({
      data: { userId, stockId: stock.id },
    });

    await this.prisma.stockPrice.create({
      data: {
        stockId: stock.id,
        open: quote.price - quote.dayChange,
        current: quote.price,
        dayHigh: quote.dayHigh,
        dayLow: quote.dayLow,
        dayChangePct: quote.dayChangePct,
      },
    });

    return {
      symbol: stock.symbol,
      name: stock.name,
      token,
      exchange,
      currentPrice: quote.price,
      dayChangePct: quote.dayChangePct,
    };
  }

  async refreshPrices(userId: string) {
    const items = await this.prisma.watchlist.findMany({
      where: { userId },
      include: { stock: true },
    });

    const stocks = items
      .filter((i) => i.stock.symbolToken)
      .map((i) => ({
        symbol: i.stock.symbol,
        token: i.stock.symbolToken!,
        exchange: i.stock.exchange,
      }));

    if (stocks.length > 0) {
      await this.stockService.fetchAndStorePrices(stocks);
    }

    return this.getWatchlist(userId);
  }

  async removeStock(userId: string, symbol: string) {
    const stock = await this.prisma.stock.findUnique({
      where: { symbol: symbol.toUpperCase() },
    });

    if (!stock) throw new NotFoundException('Stock not found');

    const entry = await this.prisma.watchlist.findUnique({
      where: { userId_stockId: { userId, stockId: stock.id } },
    });

    if (!entry) throw new NotFoundException('Stock not in your watchlist');

    await this.prisma.watchlist.delete({ where: { id: entry.id } });

    return { success: true };
  }
}
