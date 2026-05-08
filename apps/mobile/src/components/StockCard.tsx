import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WatchlistItem } from '../types';

interface StockCardProps {
  item: WatchlistItem;
  onRemove: (symbol: string) => void;
}

export function StockCard({ item, onRemove }: StockCardProps) {
  const { stock } = item;
  const isPositive = (stock.dayChangePct ?? 0) >= 0;
  const changeColor = isPositive ? '#22c55e' : '#ef4444';

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.symbol}>{stock.symbol}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {stock.name}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.price}>
          {stock.currentPrice != null
            ? `$${stock.currentPrice.toFixed(2)}`
            : '—'}
        </Text>
        <View style={[styles.changeBadge, { backgroundColor: changeColor + '20' }]}>
          <Ionicons
            name={isPositive ? 'arrow-up' : 'arrow-down'}
            size={12}
            color={changeColor}
          />
          <Text style={[styles.changeText, { color: changeColor }]}>
            {stock.dayChangePct != null
              ? `${Math.abs(stock.dayChangePct).toFixed(2)}%`
              : '—'}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={() => onRemove(stock.symbol)}
        style={styles.removeBtn}
        hitSlop={8}
      >
        <Ionicons name="close-circle" size={22} color="#64748b" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  left: { flex: 1 },
  symbol: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  name: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  price: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '600',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 2,
  },
  removeBtn: {
    padding: 4,
  },
});
