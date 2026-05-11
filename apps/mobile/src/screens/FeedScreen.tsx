import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { getFeed, markArticleSeen, forceRefreshFeed } from '../services/feed';
import { FeedCard } from '../components/FeedCard';
import type { FeedArticle } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ITEM_HEIGHT = SCREEN_HEIGHT - 164;

export default function FeedScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [forceRefreshing, setForceRefreshing] = useState(false);
  const seenSet = useRef(new Set<string>());

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => getFeed(pageParam, 10),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 2 * 60 * 1000,
  });

  const articles =
    data?.pages.flatMap((page) => page.items) ?? [];

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      viewableItems.forEach((item) => {
        const article = item.item as FeedArticle;
        if (article && !seenSet.current.has(article.id)) {
          seenSet.current.add(article.id);
          markArticleSeen(article.id).catch(() => {});
        }
      });
    },
    [],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 1500,
  }).current;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleForceRefresh = useCallback(async () => {
    if (forceRefreshing) return;
    setForceRefreshing(true);
    try {
      await forceRefreshFeed();
      await queryClient.invalidateQueries({ queryKey: ['feed'] });
    } catch (err) {
      console.error('Force refresh failed:', err);
    } finally {
      setForceRefreshing(false);
    }
  }, [forceRefreshing, queryClient]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading your feed...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorSubtitle}>Pull down to retry</Text>
      </View>
    );
  }

  if (articles.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Feed</Text>
          <Pressable
            style={styles.refreshBtn}
            onPress={handleForceRefresh}
            disabled={forceRefreshing}
            hitSlop={10}
          >
            {forceRefreshing ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <Ionicons name="cloud-download-outline" size={22} color="#3b82f6" />
            )}
          </Pressable>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📰</Text>
          <Text style={styles.emptyTitle}>No news yet</Text>
          <Text style={styles.emptySubtitle}>
            Add stocks to your watchlist, then tap{'\n'}the refresh button to fetch news
          </Text>
          <Pressable
            style={[styles.fetchBtn, forceRefreshing && styles.fetchBtnDisabled]}
            onPress={handleForceRefresh}
            disabled={forceRefreshing}
          >
            {forceRefreshing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={styles.fetchBtnText}>Fetch News Now</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Feed</Text>
        <Pressable
          style={styles.refreshBtn}
          onPress={handleForceRefresh}
          disabled={forceRefreshing}
          hitSlop={10}
        >
          {forceRefreshing ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <Ionicons name="cloud-download-outline" size={22} color="#3b82f6" />
          )}
        </Pressable>
      </View>
      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FeedCard article={item} />}
        pagingEnabled
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color="#3b82f6" />
            </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 32,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 12,
  },
  errorTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  errorSubtitle: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  fetchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 28,
  },
  fetchBtnDisabled: {
    opacity: 0.6,
  },
  fetchBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footerLoader: {
    paddingVertical: 20,
  },
});
