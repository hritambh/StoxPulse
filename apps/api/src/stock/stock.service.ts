import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { AngelOneService } from '../angel-one/angel-one.service';
import { STOCK_ALIAS_PROMPT } from '../common/prompts';

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
  private readonly openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly angel: AngelOneService,
    private readonly config: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
  }

  async search(query: string, exchange = 'NSE') {
    const results = await this.angel.searchScrip(exchange, query);

    return results.map((r: any) => ({
      symbol: r.tradingsymbol,
      token: r.symboltoken,
      name: r.name || r.tradingsymbol,
      exchange: r.exchange,
    }));
  }

  async generateAliases(symbol: string, name?: string): Promise<string[]> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: STOCK_ALIAS_PROMPT },
          {
            role: 'user',
            content: `Symbol: ${symbol}\nName: ${name || symbol}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 200,
      });

      const raw = completion.choices[0]?.message?.content?.trim();
      if (!raw) return [name || symbol];

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [name || symbol];

      const aliases = parsed
        .filter((a: unknown) => typeof a === 'string' && a.trim().length > 0)
        .map((a: string) => a.trim());

      this.logger.log(
        `Generated ${aliases.length} AI aliases for ${symbol}: ${aliases.join(', ')}`,
      );
      return aliases;
    } catch (err) {
      this.logger.warn(
        `Failed to generate AI aliases for ${symbol}, using fallback: ${err}`,
      );
      return [name || symbol];
    }
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

          const existing = await this.prisma.stock.findUnique({
            where: { symbol: match.symbol },
            select: { aliases: true },
          });
          const hasAliases =
            existing?.aliases &&
            Array.isArray(existing.aliases) &&
            existing.aliases.length > 0;

          const aliases = hasAliases
            ? (existing.aliases as string[])
            : await this.generateAliases(match.symbol, quote.name);

          const stock = await this.prisma.stock.upsert({
            where: { symbol: match.symbol },
            create: {
              symbol: match.symbol,
              name: quote.name,
              exchange,
              aliases,
            },
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
