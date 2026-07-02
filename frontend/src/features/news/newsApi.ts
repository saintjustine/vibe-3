import { requestJson } from "../../api/client";
import type {
  CollectionLog,
  NewsArticle,
  NewsArticleFilters,
  NewsCollectionResponse,
  NewsKeyword,
  NewsKeywordPayload,
} from "./newsTypes";

export async function listNewsKeywords(active?: boolean): Promise<NewsKeyword[]> {
  const params = active === undefined ? "" : `?active=${String(active)}`;
  const data = await requestJson<{ items: NewsKeyword[] }>(`/api/news/keywords${params}`);
  return data.items;
}

export async function createNewsKeyword(payload: NewsKeywordPayload): Promise<NewsKeyword> {
  return requestJson<NewsKeyword>("/api/news/keywords", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateNewsKeyword(
  keywordId: number,
  payload: NewsKeywordPayload,
): Promise<NewsKeyword> {
  return requestJson<NewsKeyword>(`/api/news/keywords/${keywordId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteNewsKeyword(keywordId: number): Promise<void> {
  await requestJson<{ deleted: boolean }>(`/api/news/keywords/${keywordId}`, {
    method: "DELETE",
  });
}

export async function listNewsArticles(filters: NewsArticleFilters = {}): Promise<NewsArticle[]> {
  const params = new URLSearchParams();
  if (filters.keywordId) {
    params.set("keyword_id", String(filters.keywordId));
  }
  if (filters.query) {
    params.set("query", filters.query);
  }
  if (filters.dateFrom) {
    params.set("date_from", filters.dateFrom);
  }
  if (filters.dateTo) {
    params.set("date_to", filters.dateTo);
  }
  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const data = await requestJson<{ items: NewsArticle[] }>(`/api/news/articles${suffix}`);
  return data.items;
}

export async function collectNews(
  keywordId?: number,
  dateFrom?: string,
  dateTo?: string,
): Promise<NewsCollectionResponse> {
  const params = new URLSearchParams();
  if (keywordId) {
    params.set("keyword_id", String(keywordId));
  }
  if (dateFrom) {
    params.set("date_from", dateFrom);
  }
  if (dateTo) {
    params.set("date_to", dateTo);
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return requestJson<NewsCollectionResponse>(`/api/news/collect${suffix}`, {
    method: "POST",
  });
}

export async function listCollectionLogs(limit = 10): Promise<CollectionLog[]> {
  const data = await requestJson<{ items: CollectionLog[] }>(`/api/news/logs?limit=${limit}`);
  return data.items;
}
