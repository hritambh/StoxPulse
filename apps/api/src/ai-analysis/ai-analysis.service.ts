import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

interface AnalysisResult {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence_score: number;
  impact_score: number;
  concise_summary: string;
  key_reasons: string[];
}

const SYSTEM_PROMPT = `You are a financial news analyst. Analyze the provided news article.
Return ONLY valid JSON with these fields:
- sentiment: "bullish" | "bearish" | "neutral"
- confidence_score: number between 0-100
- impact_score: number between 0-100
- concise_summary: string (2-4 concise sentences)
- key_reasons: string[] (max 3 reasons)

Do NOT provide financial advice. Do NOT say buy or sell. Be concise and factual.`;

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
  }

  async analyzeArticle(articleId: string) {
    const article = await this.prisma.newsArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      this.logger.warn(`Article ${articleId} not found, skipping analysis`);
      return null;
    }

    const existing = await this.prisma.newsAnalysis.findUnique({
      where: { articleId },
    });

    if (existing) {
      this.logger.log(`Article ${articleId} already analyzed, returning existing`);
      return existing;
    }

    const articleText = [
      `Headline: ${article.headline}`,
      article.summary ? `Summary: ${article.summary}` : '',
      article.content ? `Content: ${article.content}` : '',
      `Source: ${article.sourceName}`,
      `Published: ${article.publishedAt.toISOString()}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: articleText },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        this.logger.error(`Empty response from OpenAI for article ${articleId}`);
        return null;
      }

      const result: AnalysisResult = JSON.parse(raw);

      const analysis = await this.prisma.newsAnalysis.create({
        data: {
          articleId,
          sentiment: result.sentiment,
          confidence: result.confidence_score,
          impactScore: result.impact_score,
          aiSummary: result.concise_summary,
          reasoning: result.key_reasons,
        },
      });

      this.logger.log(
        `Article ${articleId} analyzed: ${result.sentiment} (confidence: ${result.confidence_score})`,
      );

      return analysis;
    } catch (err) {
      this.logger.error(`OpenAI analysis failed for article ${articleId}: ${err}`);
      return null;
    }
  }
}
