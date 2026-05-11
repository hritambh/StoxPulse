export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface StockSearchResult {
  symbol: string;
  token: string;
  name: string;
  exchange: string;
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  dayChange: number;
  dayChangePct: number;
  dayHigh: number | null;
  dayLow: number | null;
  exchange: string | null;
}

export interface WatchlistItem {
  id: string;
  addedAt: string;
  stock: {
    symbol: string;
    name: string;
    exchange: string | null;
    currentPrice: number | null;
    dayChangePct: number | null;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  watchlistCount: number;
}

export type Sentiment = 'bullish' | 'bearish' | 'neutral';

export interface NewsAnalysis {
  sentiment: Sentiment;
  confidence: number;
  aiSummary: string;
  reasoning: string[];
  impactScore: number;
}

export interface FeedArticle {
  id: string;
  headline: string;
  summary: string | null;
  sourceName: string;
  sourceUrl: string;
  imageUrl: string | null;
  publishedAt: string;
  analysis: NewsAnalysis | null;
  stocks: {
    id: string;
    symbol: string;
    name: string;
    logoUrl: string | null;
  }[];
  rankingScore: number;
}

export interface FeedResponse {
  items: FeedArticle[];
  nextCursor: string | null;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  metadata: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}
