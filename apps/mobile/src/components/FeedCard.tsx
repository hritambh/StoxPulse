import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SentimentBadge } from './SentimentBadge';
import type { FeedArticle } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_HEIGHT = SCREEN_HEIGHT - 180;

interface FeedCardProps {
  article: FeedArticle;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  );
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function FeedCard({ article }: FeedCardProps) {
  const analysis = article.analysis;
  const primaryStock = article.stocks[0];

  const openSource = () => {
    if (article.sourceUrl) {
      Linking.openURL(article.sourceUrl);
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.stockInfo}>
          <View style={styles.stockIcon}>
            <Text style={styles.stockIconText}>
              {primaryStock?.symbol?.slice(0, 2) || '$$'}
            </Text>
          </View>
          <View>
            <Text style={styles.stockSymbol}>{primaryStock?.symbol || 'MARKET'}</Text>
            <Text style={styles.stockName} numberOfLines={1}>
              {primaryStock?.name || 'Market News'}
            </Text>
          </View>
        </View>
        {analysis && (
          <SentimentBadge
            sentiment={analysis.sentiment}
            confidence={analysis.confidence}
            size="large"
          />
        )}
      </View>

      {/* Headline */}
      <Text style={styles.headline} numberOfLines={3}>
        {article.headline}
      </Text>

      {/* AI Summary */}
      {analysis && (
        <View style={styles.summarySection}>
          <View style={styles.summaryHeader}>
            <Ionicons name="sparkles" size={16} color="#8b5cf6" />
            <Text style={styles.summaryLabel}>AI Summary</Text>
          </View>
          <Text style={styles.summaryText}>{analysis.aiSummary}</Text>
        </View>
      )}

      {/* Key Reasons */}
      {analysis && analysis.reasoning.length > 0 && (
        <View style={styles.reasonsSection}>
          {analysis.reasoning.map((reason, idx) => (
            <View key={idx} style={styles.reasonRow}>
              <View
                style={[
                  styles.reasonDot,
                  {
                    backgroundColor:
                      analysis.sentiment === 'bullish'
                        ? '#22c55e'
                        : analysis.sentiment === 'bearish'
                          ? '#ef4444'
                          : '#f59e0b',
                  },
                ]}
              />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Impact Score */}
      {analysis && (
        <View style={styles.impactRow}>
          <Text style={styles.impactLabel}>Impact Score</Text>
          <View style={styles.impactBarBg}>
            <View
              style={[
                styles.impactBarFill,
                {
                  width: `${analysis.impactScore}%`,
                  backgroundColor:
                    analysis.impactScore >= 70
                      ? '#ef4444'
                      : analysis.impactScore >= 40
                        ? '#f59e0b'
                        : '#22c55e',
                },
              ]}
            />
          </View>
          <Text style={styles.impactValue}>{Math.round(analysis.impactScore)}</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.sourceRow}>
          <Ionicons name="newspaper-outline" size={14} color="#64748b" />
          <Text style={styles.sourceName}>{article.sourceName}</Text>
          <Text style={styles.timeAgo}>{timeAgo(article.publishedAt)}</Text>
        </View>
        <Pressable style={styles.readMoreBtn} onPress={openSource}>
          <Text style={styles.readMoreText}>Read Full</Text>
          <Ionicons name="open-outline" size={14} color="#3b82f6" />
        </Pressable>
      </View>

      {/* Multiple stocks indicator */}
      {article.stocks.length > 1 && (
        <View style={styles.multiStockRow}>
          {article.stocks.slice(1, 4).map((s) => (
            <View key={s.id} style={styles.multiStockBadge}>
              <Text style={styles.multiStockText}>{s.symbol}</Text>
            </View>
          ))}
          {article.stocks.length > 4 && (
            <Text style={styles.moreStocksText}>
              +{article.stocks.length - 4} more
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: CARD_HEIGHT,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 24,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  stockIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockIconText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '800',
  },
  stockSymbol: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  stockName: {
    color: '#94a3b8',
    fontSize: 13,
    maxWidth: 140,
  },
  headline: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
    marginTop: 16,
  },
  summarySection: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#8b5cf6',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  summaryText: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
  },
  reasonsSection: {
    marginTop: 14,
    gap: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  reasonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  reasonText: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  impactLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  impactBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  impactBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  impactValue: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
    width: 28,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceName: {
    color: '#64748b',
    fontSize: 13,
  },
  timeAgo: {
    color: '#475569',
    fontSize: 12,
  },
  readMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3b82f620',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  readMoreText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '600',
  },
  multiStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  multiStockBadge: {
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  multiStockText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  moreStocksText: {
    color: '#475569',
    fontSize: 11,
  },
});
