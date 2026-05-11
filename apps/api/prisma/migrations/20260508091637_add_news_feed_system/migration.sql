/*
  Warnings:

  - You are about to drop the column `read` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `sentAt` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `stockId` on the `notifications` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "notifications_userId_sentAt_idx";

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "read",
DROP COLUMN "sentAt",
DROP COLUMN "stockId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'price_drop';

-- AlterTable
ALTER TABLE "stocks" ADD COLUMN     "aliases" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "sector" TEXT;

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_articles" (
    "id" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT,
    "content" TEXT,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "imageUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_stock_relations" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "article_stock_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_analysis" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "aiSummary" TEXT NOT NULL,
    "reasoning" JSONB NOT NULL DEFAULT '[]',
    "impactScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_feed" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "rankingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_feed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "news_articles_hash_key" ON "news_articles"("hash");

-- CreateIndex
CREATE INDEX "news_articles_publishedAt_idx" ON "news_articles"("publishedAt");

-- CreateIndex
CREATE INDEX "news_articles_createdAt_idx" ON "news_articles"("createdAt");

-- CreateIndex
CREATE INDEX "article_stock_relations_stockId_idx" ON "article_stock_relations"("stockId");

-- CreateIndex
CREATE UNIQUE INDEX "article_stock_relations_articleId_stockId_key" ON "article_stock_relations"("articleId", "stockId");

-- CreateIndex
CREATE UNIQUE INDEX "news_analysis_articleId_key" ON "news_analysis"("articleId");

-- CreateIndex
CREATE INDEX "news_analysis_sentiment_idx" ON "news_analysis"("sentiment");

-- CreateIndex
CREATE INDEX "user_feed_userId_rankingScore_idx" ON "user_feed"("userId", "rankingScore");

-- CreateIndex
CREATE INDEX "user_feed_userId_createdAt_idx" ON "user_feed"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_feed_userId_articleId_key" ON "user_feed"("userId", "articleId");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_stock_relations" ADD CONSTRAINT "article_stock_relations_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_stock_relations" ADD CONSTRAINT "article_stock_relations_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_analysis" ADD CONSTRAINT "news_analysis_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_feed" ADD CONSTRAINT "user_feed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_feed" ADD CONSTRAINT "user_feed_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
