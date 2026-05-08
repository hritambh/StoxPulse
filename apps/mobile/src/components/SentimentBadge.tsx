import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Sentiment } from '../types';

interface SentimentBadgeProps {
  sentiment: Sentiment;
  confidence: number;
  size?: 'small' | 'large';
}

const SENTIMENT_CONFIG: Record<
  Sentiment,
  { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }
> = {
  bullish: {
    color: '#22c55e',
    bg: '#22c55e18',
    icon: 'trending-up',
    label: 'Bullish',
  },
  bearish: {
    color: '#ef4444',
    bg: '#ef444418',
    icon: 'trending-down',
    label: 'Bearish',
  },
  neutral: {
    color: '#f59e0b',
    bg: '#f59e0b18',
    icon: 'remove',
    label: 'Neutral',
  },
};

export function SentimentBadge({ sentiment, confidence, size = 'small' }: SentimentBadgeProps) {
  const config = SENTIMENT_CONFIG[sentiment];
  const isLarge = size === 'large';

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, isLarge && styles.badgeLarge]}>
      <Ionicons
        name={config.icon}
        size={isLarge ? 18 : 14}
        color={config.color}
      />
      <Text
        style={[
          styles.label,
          { color: config.color },
          isLarge && styles.labelLarge,
        ]}
      >
        {config.label}
      </Text>
      <Text
        style={[
          styles.confidence,
          { color: config.color },
          isLarge && styles.confidenceLarge,
        ]}
      >
        {Math.round(confidence)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  labelLarge: {
    fontSize: 15,
  },
  confidence: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.8,
  },
  confidenceLarge: {
    fontSize: 14,
  },
});
