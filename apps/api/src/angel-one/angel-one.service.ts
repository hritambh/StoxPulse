import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { generateTotp } from './totp';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { SmartAPI } = require('smartapi-javascript');

@Injectable()
export class AngelOneService implements OnModuleInit {
  private readonly logger = new Logger(AngelOneService.name);
  private smart: any;
  private isConnected = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  private async connect() {
    const apiKey = this.config.getOrThrow<string>('ANGEL_API_KEY');
    const clientCode = this.config.getOrThrow<string>('ANGEL_CLIENT_CODE');
    const mpin = this.config.getOrThrow<string>('ANGEL_MPIN');
    const totpSecret = this.config.getOrThrow<string>('ANGEL_TOTP_SECRET');

    const totp = generateTotp(totpSecret);

    this.smart = new SmartAPI({ api_key: apiKey });

    try {
      const session = await this.smart.generateSession(clientCode, mpin, totp);

      if (session?.status) {
        this.isConnected = true;
        this.logger.log('Angel One session established');
      } else {
        this.logger.error(`Angel One login failed: ${JSON.stringify(session)}`);
      }
    } catch (err) {
      this.logger.error(`Angel One connection error: ${err}`);
    }
  }

  /** Refresh session every 6 hours (token typically expires in 8h) */
  @Cron('0 */6 * * *')
  async refreshSession() {
    this.logger.log('Refreshing Angel One session...');
    await this.connect();
  }

  async searchScrip(exchange: string, query: string): Promise<any[]> {
    this.ensureConnected();
    const result = await this.smart.searchScrip({ exchange, searchscrip: query });
    return Array.isArray(result) ? result : [];
  }

  /**
   * Fetch market data for given tokens.
   * @param mode "LTP" | "OHLC" | "FULL"
   * @param exchangeTokens e.g. { "NSE": ["3045", "26009"] }
   */
  async marketData(
    mode: 'LTP' | 'OHLC' | 'FULL',
    exchangeTokens: Record<string, string[]>,
  ): Promise<any> {
    this.ensureConnected();
    return this.smart.marketData({ mode, exchangeTokens });
  }

  private ensureConnected() {
    if (!this.isConnected) {
      throw new Error('Angel One session not established. Check broker credentials.');
    }
  }
}
