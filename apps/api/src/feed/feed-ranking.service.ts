import { Injectable } from '@nestjs/common';

const WEIGHT_RELEVANCE = 0.35;
const WEIGHT_IMPACT = 0.3;
const WEIGHT_FRESHNESS = 0.2;
const WEIGHT_CONFIDENCE = 0.15;
const FRESHNESS_HALF_LIFE_HOURS = 24;

@Injectable()
export class FeedRankingService {
  calculateRankingScore(
    relevanceScore: number,
    impactScore: number,
    confidence: number,
    publishedAt: Date,
  ): number {
    const hoursOld =
      (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
    const freshnessScore =
      Math.exp(-hoursOld / FRESHNESS_HALF_LIFE_HOURS) * 100;

    return (
      relevanceScore * WEIGHT_RELEVANCE +
      impactScore * WEIGHT_IMPACT +
      freshnessScore * WEIGHT_FRESHNESS +
      confidence * WEIGHT_CONFIDENCE
    );
  }
}
