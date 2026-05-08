import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { StockCard } from '../components/StockCard';
import type { WatchlistItem } from '../types';

export default function WatchlistScreen() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWatchlist = useCallback(async () => {
    try {
      const { data } = await api.get<WatchlistItem[]>('/watchlist');
      setItems(data);
    } catch (err) {
      console.error('Failed to fetch watchlist:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchWatchlist();
    }, [fetchWatchlist]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data } = await api.post<WatchlistItem[]>('/watchlist/refresh');
      setItems(data);
    } catch (err) {
      console.error('Failed to refresh prices:', err);
      await fetchWatchlist();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemove = async (symbol: string) => {
    try {
      await api.delete(`/watchlist/${symbol}`);
      setItems((prev) => prev.filter((i) => i.stock.symbol !== symbol));
    } catch (err) {
      console.error('Failed to remove stock:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Your Watchlist</Text>
        <Pressable
          onPress={handleRefresh}
          disabled={refreshing}
          style={styles.refreshBtn}
          hitSlop={10}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <Ionicons name="refresh" size={22} color="#3b82f6" />
          )}
        </Pressable>
      </View>
      {items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No stocks yet</Text>
          <Text style={styles.emptySubtitle}>
            Search and add stocks to your watchlist
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <StockCard item={item} onRemove={handleRemove} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#3b82f6"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
  },
  refreshBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 6,
  },
});
