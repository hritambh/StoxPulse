# StoxPulse

**AI-powered personalized stock intelligence feed** — like Inshorts for stock news, powered by AI.

**Stack:** React Native (Expo) + NestJS + PostgreSQL + Redis + RabbitMQ + OpenAI

---

## Architecture

```
StoxPulse/
├── apps/
│   ├── api/                              # NestJS Backend
│   │   ├── prisma/schema.prisma          # Database schema (8 models)
│   │   ├── prisma/seed.ts                # Seed top NSE stocks
│   │   ├── src/
│   │   │   ├── auth/                     # JWT + refresh token rotation
│   │   │   ├── user/                     # User profile + push token
│   │   │   ├── stock/                    # Angel One market data
│   │   │   ├── watchlist/                # Watchlist CRUD
│   │   │   ├── news/                     # News ingestion pipeline
│   │   │   │   ├── news-ingestion        # Finnhub + NewsAPI fetcher
│   │   │   │   ├── stock-relevance       # Smart article→stock mapping
│   │   │   │   └── news-cron             # 10-min scheduled fetch
│   │   │   ├── ai-analysis/              # OpenAI sentiment analysis
│   │   │   │   ├── ai-analysis.service   # GPT-4o-mini integration
│   │   │   │   └── ai-analysis.worker    # RabbitMQ consumer
│   │   │   ├── feed/                     # Personalized feed engine
│   │   │   │   ├── feed-ranking          # Weighted ranking formula
│   │   │   │   ├── feed.service          # Cursor pagination + Redis cache
│   │   │   │   └── feed.worker           # Async feed builder
│   │   │   ├── notification/             # Multi-type push notifications
│   │   │   ├── price-worker/             # Cron price fetcher + alerts
│   │   │   ├── redis/                    # Redis caching service
│   │   │   ├── queue/                    # RabbitMQ queue service
│   │   │   ├── prisma/                   # Database service
│   │   │   └── common/                   # Shared decorators
│   │   ├── Dockerfile
│   │   └── docker-compose.yml            # Postgres + Redis + RabbitMQ
│   └── mobile/                           # Expo React Native App
│       ├── src/
│       │   ├── screens/
│       │   │   ├── FeedScreen            # Swipeable AI news cards
│       │   │   ├── WatchlistScreen       # Stock watchlist
│       │   │   ├── SearchScreen          # Stock search
│       │   │   ├── NotificationsScreen   # Alert center
│       │   │   ├── ProfileScreen         # User profile
│       │   │   ├── LoginScreen           # Auth
│       │   │   └── SignupScreen          # Auth
│       │   ├── components/
│       │   │   ├── FeedCard              # Full-screen news card
│       │   │   ├── SentimentBadge        # Bullish/Bearish/Neutral
│       │   │   └── StockCard             # Watchlist item
│       │   ├── navigation/               # Bottom tabs + auth stack
│       │   ├── services/                 # API client, auth, feed
│       │   ├── store/                    # Zustand state management
│       │   ├── hooks/                    # useStockSearch
│       │   └── types/                    # TypeScript types
│       └── App.tsx
└── README.md
```

## Features

### Core
- **JWT auth with refresh token rotation** — secure access + refresh token pair
- **Stock watchlist** — add/remove NSE/BSE stocks, real-time prices via Angel One
- **AI-powered news feed** — swipeable full-screen cards with AI analysis
- **Sentiment analysis** — Bullish/Bearish/Neutral with confidence scores
- **Smart ranking** — relevance × impact × freshness × confidence weighted formula
- **Push notifications** — price drops, sentiment alerts, earnings

### News Pipeline
- **Multi-source ingestion** — Finnhub + NewsAPI, normalized and deduplicated
- **Stock relevance engine** — ticker, company name, alias matching with scoring
- **Async AI processing** — RabbitMQ workers, never in API request path
- **Per-article analysis** — 1 article → 1 AI call → many users reuse

### Mobile
- **Inshorts-style feed** — vertical swipeable cards, infinite scroll
- **React Query** — intelligent caching, background refetch
- **Zustand** — lightweight state management
- **5-tab navigation** — Feed, Watchlist, Search, Alerts, Profile

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on phone

## Quick Start

### 1. Start Infrastructure

```bash
cd apps/api
docker compose up -d
```

This starts PostgreSQL, Redis, and RabbitMQ.

RabbitMQ management UI: http://localhost:15672 (stoxpulse/stoxpulse123)

### 2. Setup Backend

```bash
# From project root
npm install

# Setup environment
cd apps/api
cp .env.example .env
# Edit .env with your API keys (OpenAI, Finnhub, NewsAPI, Angel One)

# Run database migrations
npx prisma migrate dev --name init

# Seed initial stocks
npm run prisma:seed

# Start dev server
npm run start
```

API: http://localhost:3000
Swagger docs: http://localhost:3000/api/docs

### 3. Setup Mobile App

```bash
cd apps/mobile
npm install
npx expo start
```

Scan QR code with Expo Go. Update `API_BASE` in `src/services/api.ts` for physical devices.

## API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/signup` | No | Create account |
| POST | `/auth/login` | No | Login, returns JWT + refresh token |
| POST | `/auth/refresh` | No | Rotate refresh token |
| POST | `/auth/logout` | No | Invalidate refresh token |

### Stocks & Watchlist
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/stocks/search?q=` | Yes | Search stocks |
| GET | `/stocks/:symbol/quote` | Yes | Real-time quote |
| GET | `/watchlist` | Yes | User's watchlist |
| POST | `/watchlist/:symbol` | Yes | Add to watchlist |
| DELETE | `/watchlist/:symbol` | Yes | Remove from watchlist |

### Feed
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/feed?cursor=&limit=` | Yes | Personalized feed (paginated) |
| GET | `/feed/:articleId` | Yes | Article detail |
| PATCH | `/feed/:articleId/seen` | Yes | Mark as seen |

### Notifications
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | Yes | User notifications |
| PATCH | `/notifications/:id/read` | Yes | Mark as read |
| PATCH | `/notifications/read-all` | Yes | Mark all as read |

### User
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/user/profile` | Yes | Get profile |
| PATCH | `/user/push-token` | Yes | Register push token |

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | User accounts + push tokens |
| `refresh_tokens` | Refresh token rotation |
| `stocks` | NSE/BSE stocks with aliases |
| `watchlists` | User → stock relationships |
| `stock_prices` | Time-series price data |
| `news_articles` | Raw ingested articles (deduplicated) |
| `article_stock_relations` | Article ↔ stock relevance mapping |
| `news_analysis` | AI sentiment + summary per article |
| `user_feed` | Precomputed ranked feed per user |
| `notifications` | Multi-type notification log |

## Feed Ranking Formula

```
ranking = relevance_score × 0.35
        + impact_score × 0.30
        + freshness_score × 0.20
        + confidence × 0.15

freshness_score = e^(-hours_old / 24) × 100
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `JWT_SECRET` | Yes | JWT signing secret |
| `REDIS_HOST` | Yes | Redis host |
| `RABBITMQ_URL` | Yes | RabbitMQ AMQP URL |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `FINNHUB_API_KEY` | Optional | Finnhub news API |
| `NEWS_API_KEY` | Optional | NewsAPI.org key |
| `ANGEL_API_KEY` | Yes | Angel One SmartAPI |
| `ANGEL_CLIENT_CODE` | Yes | Angel One client |
| `ANGEL_MPIN` | Yes | Angel One MPIN |
| `ANGEL_TOTP_SECRET` | Yes | Angel One TOTP |

## Key Design Decisions

- **Per-article AI analysis** — 1 article analyzed once, result shared across all users (cost-optimized)
- **Async workers via RabbitMQ** — AI never runs during API requests
- **Redis feed caching** — 2-minute TTL, invalidated on feed rebuild
- **Cursor pagination** — efficient for infinite scroll
- **Refresh token rotation** — each refresh generates new token pair
- **Stock relevance scoring** — weighted multi-signal matching (ticker, name, aliases)
- **Freshness decay** — exponential decay prevents stale news from dominating


# 1. Start Postgres + Redis + RabbitMQ
cd apps/api && docker compose up -d

# 2. Configure environment
cp .env.example .env
# Edit .env with your OpenAI, Finnhub, NewsAPI, and Angel One keys

# 3. Migrate DB + seed stocks
npx prisma migrate dev --name full-schema
npm run prisma:seed

# 4. Start backend
npm run start

# 5. In another terminal — start mobile
cd apps/mobile && npx expo start
