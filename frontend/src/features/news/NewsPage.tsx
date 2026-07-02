import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  collectNews,
  createNewsKeyword,
  deleteNewsKeyword,
  listCollectionLogs,
  listNewsArticles,
  listNewsKeywords,
  updateNewsKeyword,
} from "./newsApi";
import type { CollectionLog, NewsArticle, NewsKeyword, NewsKeywordPayload } from "./newsTypes";

type Notice = { tone: "success" | "warning" | "error"; text: string };

const emptyKeywordForm: NewsKeywordPayload = {
  keyword: "",
  is_active: true,
};

export function NewsPage() {
  const [keywords, setKeywords] = useState<NewsKeyword[]>([]);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [logs, setLogs] = useState<CollectionLog[]>([]);
  const [form, setForm] = useState<NewsKeywordPayload>(emptyKeywordForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [keywordFilter, setKeywordFilter] = useState("");
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);

  const activeKeywordCount = useMemo(
    () => keywords.filter((keyword) => keyword.is_active).length,
    [keywords],
  );

  useEffect(() => {
    void loadPage();
  }, []);

  useEffect(() => {
    void loadArticles();
  }, [keywordFilter]);

  async function loadPage() {
    setLoading(true);
    try {
      const [nextKeywords, nextArticles, nextLogs] = await Promise.all([
        listNewsKeywords(),
        listNewsArticles({ limit: 50 }),
        listCollectionLogs(),
      ]);
      setKeywords(nextKeywords);
      setArticles(nextArticles);
      setLogs(nextLogs);
    } catch (error) {
      setNotice({ tone: "error", text: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  async function loadArticles() {
    if (dateFrom && dateTo && dateTo < dateFrom) {
      setNotice({ tone: "warning", text: "종료일은 시작일과 같거나 이후여야 합니다." });
      return;
    }
    try {
      setArticles(
        await listNewsArticles({
          keywordId: keywordFilter ? Number(keywordFilter) : undefined,
          query: query.trim() || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          limit: 50,
        }),
      );
    } catch (error) {
      setNotice({ tone: "error", text: errorMessage(error) });
    }
  }

  async function handleKeywordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = { ...form, keyword: form.keyword.trim() };
    if (!payload.keyword) {
      setNotice({ tone: "warning", text: "키워드를 입력하세요." });
      return;
    }

    try {
      if (editingId) {
        await updateNewsKeyword(editingId, payload);
        setNotice({ tone: "success", text: "키워드를 수정했습니다." });
      } else {
        await createNewsKeyword(payload);
        setNotice({ tone: "success", text: "키워드를 등록했습니다." });
      }
      setForm(emptyKeywordForm);
      setEditingId(null);
      setKeywords(await listNewsKeywords());
    } catch (error) {
      setNotice({ tone: "error", text: errorMessage(error) });
    }
  }

  async function handleKeywordToggle(keyword: NewsKeyword) {
    try {
      await updateNewsKeyword(keyword.id, {
        keyword: keyword.keyword,
        is_active: !keyword.is_active,
      });
      setKeywords(await listNewsKeywords());
    } catch (error) {
      setNotice({ tone: "error", text: errorMessage(error) });
    }
  }

  async function handleKeywordDelete(keywordId: number) {
    try {
      await deleteNewsKeyword(keywordId);
      if (keywordFilter === String(keywordId)) {
        setKeywordFilter("");
      }
      setKeywords(await listNewsKeywords());
      setNotice({ tone: "success", text: "키워드를 삭제했습니다." });
    } catch (error) {
      setNotice({ tone: "error", text: errorMessage(error) });
    }
  }

  async function handleCollect(keywordId?: number) {
    if (dateFrom && dateTo && dateTo < dateFrom) {
      setNotice({ tone: "warning", text: "종료일은 시작일과 같거나 이후여야 합니다." });
      return;
    }
    setCollecting(true);
    try {
      const result = await collectNews(keywordId, dateFrom || undefined, dateTo || undefined);
      setNotice({
        tone: result.collected_count > 0 ? "success" : "warning",
        text: `신규 기사 ${result.collected_count}건을 저장했습니다.`,
      });
      const [nextArticles, nextLogs] = await Promise.all([
        listNewsArticles({
          keywordId: keywordFilter ? Number(keywordFilter) : undefined,
          query: query.trim() || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          limit: 50,
        }),
        listCollectionLogs(),
      ]);
      setArticles(nextArticles);
      setLogs(nextLogs);
    } catch (error) {
      setNotice({ tone: "error", text: errorMessage(error) });
    } finally {
      setCollecting(false);
    }
  }

  function beginEdit(keyword: NewsKeyword) {
    setEditingId(keyword.id);
    setForm({ keyword: keyword.keyword, is_active: keyword.is_active });
  }

  return (
    <article className="panel news-page">
      <div className="news-topbar">
        <div>
          <span className="panel-label">News Collector</span>
          <h2>뉴스 기사 수집</h2>
          <p>키워드 기준으로 Google News RSS를 수집하고, 중복 URL을 제외한 기사 요약을 저장합니다.</p>
        </div>
        <div className="news-actions">
          <button className="primary-button" disabled={collecting || activeKeywordCount === 0} type="button" onClick={() => void handleCollect()}>
            {collecting ? "수집 중..." : "활성 키워드 수집"}
          </button>
        </div>
      </div>

      {notice ? <p className={`notice ${notice.tone}`}>{notice.text}</p> : null}

      <section className="news-layout">
        <aside className="news-sidebar">
          <section className="keyword-admin">
            <div className="section-title-row">
              <h3>키워드 관리</h3>
              <span>{activeKeywordCount} active</span>
            </div>
            <form className="stacked-form compact" onSubmit={handleKeywordSubmit}>
              <label>
                키워드
                <input
                  placeholder="예: 인공지능, 반도체"
                  value={form.keyword}
                  onChange={(event) => setForm({ ...form, keyword: event.target.value })}
                />
              </label>
              <label className="inline-check">
                <input
                  checked={form.is_active}
                  type="checkbox"
                  onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                />
                자동 수집 활성화
              </label>
              <div className="button-row">
                <button className="primary-button" type="submit">
                  {editingId ? "수정" : "등록"}
                </button>
                {editingId ? (
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setForm(emptyKeywordForm);
                    }}
                  >
                    취소
                  </button>
                ) : null}
              </div>
            </form>

            <div className="keyword-list">
              {keywords.length === 0 ? <p className="empty-text">등록된 키워드가 없습니다.</p> : null}
              {keywords.map((keyword) => (
                <div className={keyword.is_active ? "keyword-card" : "keyword-card inactive"} key={keyword.id}>
                  <div>
                    <strong>{keyword.keyword}</strong>
                    <span>{keyword.is_active ? "active" : "paused"}</span>
                  </div>
                  <div>
                    <button type="button" onClick={() => void handleCollect(keyword.id)} disabled={collecting}>
                      수집
                    </button>
                    <button type="button" onClick={() => beginEdit(keyword)}>
                      수정
                    </button>
                    <button type="button" onClick={() => void handleKeywordToggle(keyword)}>
                      {keyword.is_active ? "중지" : "활성"}
                    </button>
                    <button type="button" onClick={() => void handleKeywordDelete(keyword.id)}>
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="collection-log-panel">
            <h3>최근 수집 로그</h3>
            {logs.length === 0 ? <p className="empty-text">아직 수집 로그가 없습니다.</p> : null}
            {logs.map((log) => (
              <div className={`log-item ${log.status}`} key={log.id}>
                <strong>{log.status}</strong>
                <span>{log.message ?? "No message"}</span>
              </div>
            ))}
          </section>
        </aside>

        <section className="news-main">
          <div className="news-filter-bar">
            <label>
              키워드
              <select value={keywordFilter} onChange={(event) => setKeywordFilter(event.target.value)}>
                <option value="">전체</option>
                {keywords.map((keyword) => (
                  <option key={keyword.id} value={keyword.id}>
                    {keyword.keyword}
                  </option>
                ))}
              </select>
            </label>
            <label>
              기사 검색
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목, 출처, 요약 검색" />
            </label>
            <label>
              시작일
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label>
              종료일
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
            <button className="primary-button" type="button" onClick={() => void loadArticles()}>
              검색
            </button>
          </div>

          {loading ? <p className="empty-text">뉴스 데이터를 불러오는 중입니다.</p> : null}
          {!loading && articles.length === 0 ? <p className="empty-text">수집된 기사가 없습니다.</p> : null}

          <div className="article-list">
            {articles.map((article) => (
              <article className="article-card" key={article.id}>
                <div className="article-meta">
                  <span>{article.keyword ?? "keyword"}</span>
                  <span>{article.source ?? "Unknown source"}</span>
                  <time>{formatDate(article.published_at ?? article.collected_at)}</time>
                </div>
                <h3>{article.title}</h3>
                <p>{article.summary || article.content || "요약 정보가 없습니다."}</p>
                <a href={article.url} rel="noreferrer" target="_blank">
                  원문 보기
                </a>
              </article>
            ))}
          </div>
        </section>
      </section>
    </article>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
}
