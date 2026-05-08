import api from './api';
import type { FeedResponse, FeedArticle } from '../types';

export async function getFeed(
  cursor?: string,
  limit = 20,
): Promise<FeedResponse> {
  const params: Record<string, string | number> = { limit };
  if (cursor) params.cursor = cursor;

  const { data } = await api.get<FeedResponse>('/feed', { params });
  return data;
}

export async function getArticleDetail(
  articleId: string,
): Promise<FeedArticle> {
  const { data } = await api.get<FeedArticle>(`/feed/${articleId}`);
  return data;
}

export async function markArticleSeen(articleId: string): Promise<void> {
  await api.patch(`/feed/${articleId}/seen`);
}
