import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStockSearch } from '../hooks/useStockSearch';
import api from '../services/api';
import type { StockSearchResult } from '../types';

export default function SearchScreen() {
  const { results, loading, search } = useStockSearch();
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const handleQueryChange = (text: string) => {
    setQuery(text);
    search(text);
  };

  const handleAdd = async (stock: StockSearchResult) => {
    setAddingSymbol(stock.symbol);
    try {
      await api.post(`/watchlist/${stock.symbol}`, {
        token: stock.token,
        exchange: stock.exchange,
        name: stock.name,
      });
      Alert.alert('Added', `${stock.symbol} added to your watchlist`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to add stock';
      Alert.alert('Error', msg);
    } finally {
      setAddingSymbol(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Search Stocks</Text>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by symbol or name..."
          placeholderTextColor="#64748b"
          value={query}
          onChangeText={handleQueryChange}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {loading && <ActivityIndicator size="small" color="#3b82f6" />}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.symbol}
        renderItem={({ item }) => (
          <View style={styles.resultRow}>
            <View style={styles.resultInfo}>
              <Text style={styles.resultSymbol}>{item.symbol}</Text>
              <Text style={styles.resultName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.resultExchange}>{item.exchange}</Text>
            </View>
            <Pressable
              style={styles.addBtn}
              onPress={() => handleAdd(item)}
              disabled={addingSymbol === item.symbol}
            >
              {addingSymbol === item.symbol ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : (
                <Ionicons name="add-circle" size={28} color="#3b82f6" />
              )}
            </Pressable>
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          query.length > 0 && !loading ? (
            <Text style={styles.emptyText}>No results found</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#f8fafc',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  resultInfo: { flex: 1 },
  resultSymbol: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '700',
  },
  resultName: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  resultExchange: {
    color: '#475569',
    fontSize: 11,
    marginTop: 2,
  },
  addBtn: {
    padding: 4,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  },
});
