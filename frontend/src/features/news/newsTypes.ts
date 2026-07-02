export type NewsKeyword = {
  id: number;
  keyword: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type NewsKeywordPayload = {
  keyword: string;
  is_active: boolean;
};

export type NewsArticle = {
  id: number;
  keyword_id: number | null;
  keyword: string | null;
  title: string;
  source: string | null;
  url: string;
  published_at: string | null;
  collected_at: string;
  summary: string | null;
  content: string | null;
};

export type CollectionLog = {
  id: number;
  job_name: string;
  keyword_id: number | null;
  status: string;
  message: string | null;
  collected_count: number;
  started_at: string | null;
  finished_at: string | null;
};

export type NewsCollectionResponse = {
  fetched_count: number;
  collected_count: number;
  duplicate_count: number;
  failed_count: number;
  logs: CollectionLog[];
};

export type NewsArticleFilters = {
  keywordId?: number;
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
};
