import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AngelOneService } from '../angel-one/angel-one.service';

export interface StockQuote {
  symbol: string;
  name: string;
  token: string;
  exchange: string;
  price: number;
  dayChange: number;
  dayChangePct: number;
  dayHigh: number | null;
  dayLow: number | null;
}

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly angel: AngelOneService,
  ) {}

  async search(query: string, exchange = 'NSE') {
    const results = await this.angel.searchScrip(exchange, query);

    return results.map((r: any) => ({
      symbol: r.tradingsymbol,
      token: r.symboltoken,
      exchange: r.exchange,
    }));
  }

  async getQuote(symbol: string, token: string, exchange = 'NSE'): Promise<StockQuote> {
    const response = await this.angel.marketData('FULL', {
      [exchange]: [token],
    });

    const data = response?.data?.fetched?.[0] ?? {};

    const current = data.ltp ?? 0;
    const close = data.close ?? current;
    const change = current - close;
    const changePct = close > 0 ? (change / close) * 100 : 0;

    return {
      symbol,
      name: data.tradingSymbol || symbol,
      token,
      exchange,
      price: current,
      dayChange: change,
      dayChangePct: changePct,
      dayHigh: data.high ?? null,
      dayLow: data.low ?? null,
    };
  }

  async fetchAndStorePrices(
    stocks: { symbol: string; token: string; exchange: string }[],
  ): Promise<StockQuote[]> {
    const quotes: StockQuote[] = [];

    // Group tokens by exchange for batch requests
    const byExchange: Record<string, { symbol: string; token: string }[]> = {};
    for (const s of stocks) {
      (byExchange[s.exchange] ??= []).push(s);
    }

    for (const [exchange, items] of Object.entries(byExchange)) {
      try {
        const tokens = items.map((i) => i.token);
        const response = await this.angel.marketData('FULL', {
          [exchange]: tokens,
        });

        const fetched: any[] = response?.data?.fetched ?? [];

        for (const data of fetched) {
          const match = items.find((i) => i.token === String(data.symbolToken));
          if (!match) continue;

          const current = data.ltp ?? 0;
          const close = data.close ?? current;
          const change = current - close;
          const changePct = close > 0 ? (change / close) * 100 : 0;

          const quote: StockQuote = {
            symbol: match.symbol,
            name: data.tradingSymbol || match.symbol,
            token: match.token,
            exchange,
            price: current,
            dayChange: change,
            dayChangePct: changePct,
            dayHigh: data.high ?? null,
            dayLow: data.low ?? null,
          };
          quotes.push(quote);

          const stock = await this.prisma.stock.upsert({
            where: { symbol: match.symbol },
            create: { symbol: match.symbol, name: quote.name, exchange, aliases: [] },
            update: { name: quote.name },
          });

          await this.prisma.stockPrice.create({
            data: {
              stockId: stock.id,
              open: data.open ?? close,
              current,
              dayHigh: quote.dayHigh,
              dayLow: quote.dayLow,
              dayChangePct: changePct,
            },
          });
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch prices for ${exchange}: ${err}`);
      }
    }

    return quotes;
  }
}
