from sqlite3 import IntegrityError, Row

from app.core.database import get_connection
from app.schemas.news import NewsKeywordCreate


def _keyword_from_row(row: Row) -> dict:
    return {
        "id": row["id"],
        "keyword": row["keyword"],
        "is_active": bool(row["is_active"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _article_from_row(row: Row) -> dict:
    return {
        "id": row["id"],
        "keyword_id": row["keyword_id"],
        "keyword": row["keyword"],
        "title": row["title"],
        "source": row["source"],
        "url": row["url"],
        "published_at": row["published_at"],
        "collected_at": row["collected_at"],
        "summary": row["summary"],
        "content": row["content"],
    }


def _log_from_row(row: Row) -> dict:
    return {
        "id": row["id"],
        "job_name": row["job_name"],
        "keyword_id": row["keyword_id"],
        "status": row["status"],
        "message": row["message"],
        "collected_count": row["collected_count"],
        "started_at": row["started_at"],
        "finished_at": row["finished_at"],
    }


class NewsRepository:
    def list_keywords(self, active: bool | None = None) -> list[dict]:
        params: list[object] = []
        where_clause = ""
        if active is not None:
            where_clause = "WHERE is_active = ?"
            params.append(1 if active else 0)

        with get_connection() as connection:
            rows = connection.execute(
                f"""
                SELECT id, keyword, is_active, created_at, updated_at
                FROM news_keywords
                {where_clause}
                ORDER BY is_active DESC, keyword COLLATE NOCASE
                """,
                params,
            ).fetchall()
        return [_keyword_from_row(row) for row in rows]

    def get_keyword(self, keyword_id: int) -> dict | None:
        with get_connection() as connection:
            row = connection.execute(
                """
                SELECT id, keyword, is_active, created_at, updated_at
                FROM news_keywords
                WHERE id = ?
                """,
                (keyword_id,),
            ).fetchone()
        return _keyword_from_row(row) if row else None

    def create_keyword(self, payload: NewsKeywordCreate) -> dict:
        try:
            with get_connection() as connection:
                cursor = connection.execute(
                    """
                    INSERT INTO news_keywords (keyword, is_active)
                    VALUES (?, ?)
                    """,
                    (payload.keyword, 1 if payload.is_active else 0),
                )
                connection.commit()
                keyword_id = cursor.lastrowid
        except IntegrityError as exc:
            raise ValueError("Keyword already exists.") from exc

        keyword = self.get_keyword(int(keyword_id))
        if keyword is None:
            raise RuntimeError("Created keyword could not be loaded.")
        return keyword

    def update_keyword(self, keyword_id: int, payload: NewsKeywordCreate) -> dict | None:
        try:
            with get_connection() as connection:
                cursor = connection.execute(
                    """
                    UPDATE news_keywords
                    SET keyword = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (payload.keyword, 1 if payload.is_active else 0, keyword_id),
                )
                connection.commit()
                if cursor.rowcount == 0:
                    return None
        except IntegrityError as exc:
            raise ValueError("Keyword already exists.") from exc
        return self.get_keyword(keyword_id)

    def delete_keyword(self, keyword_id: int) -> bool:
        with get_connection() as connection:
            cursor = connection.execute("DELETE FROM news_keywords WHERE id = ?", (keyword_id,))
            connection.commit()
        return cursor.rowcount > 0

    def list_articles(
        self,
        *,
        keyword_id: int | None = None,
        query: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        limit: int = 50,
    ) -> list[dict]:
        conditions: list[str] = []
        params: list[object] = []

        if keyword_id:
            conditions.append("a.keyword_id = ?")
            params.append(keyword_id)
        if query:
            conditions.append("(a.title LIKE ? OR a.summary LIKE ? OR a.source LIKE ?)")
            like = f"%{query}%"
            params.extend([like, like, like])
        if date_from:
            conditions.append("COALESCE(a.published_at, a.collected_at) >= ?")
            params.append(f"{date_from}T00:00:00")
        if date_to:
            conditions.append("COALESCE(a.published_at, a.collected_at) <= ?")
            params.append(f"{date_to}T23:59:59")

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        params.append(limit)

        with get_connection() as connection:
            rows = connection.execute(
                f"""
                SELECT
                    a.id,
                    a.keyword_id,
                    COALESCE(k.keyword, a.keyword) AS keyword,
                    a.title,
                    a.source,
                    a.url,
                    a.published_at,
                    a.collected_at,
                    a.summary,
                    a.content
                FROM news_articles a
                LEFT JOIN news_keywords k ON k.id = a.keyword_id
                {where_clause}
                ORDER BY COALESCE(a.published_at, a.collected_at) DESC, a.id DESC
                LIMIT ?
                """,
                params,
            ).fetchall()
        return [_article_from_row(row) for row in rows]

    def create_article(self, article: dict) -> dict | None:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT OR IGNORE INTO news_articles (
                    keyword_id,
                    keyword,
                    title,
                    source,
                    url,
                    published_at,
                    summary,
                    content
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    article["keyword_id"],
                    article["keyword"],
                    article["title"],
                    article["source"],
                    article["url"],
                    article["published_at"],
                    article["summary"],
                    article["content"],
                ),
            )
            connection.commit()
            if cursor.rowcount == 0:
                return None
            article_id = cursor.lastrowid

        with get_connection() as connection:
            row = connection.execute(
                """
                SELECT
                    a.id,
                    a.keyword_id,
                    COALESCE(k.keyword, a.keyword) AS keyword,
                    a.title,
                    a.source,
                    a.url,
                    a.published_at,
                    a.collected_at,
                    a.summary,
                    a.content
                FROM news_articles a
                LEFT JOIN news_keywords k ON k.id = a.keyword_id
                WHERE a.id = ?
                """,
                (article_id,),
            ).fetchone()
        return _article_from_row(row) if row else None

    def create_collection_log(
        self,
        *,
        keyword_id: int | None,
        status: str,
        message: str,
        collected_count: int,
        started_at: str,
        finished_at: str,
    ) -> dict:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO collection_logs (
                    job_name,
                    keyword_id,
                    status,
                    message,
                    collected_count,
                    started_at,
                    finished_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "news_collection",
                    keyword_id,
                    status,
                    message,
                    collected_count,
                    started_at,
                    finished_at,
                ),
            )
            connection.commit()
            log_id = cursor.lastrowid

        with get_connection() as connection:
            row = connection.execute(
                """
                SELECT id, job_name, keyword_id, status, message, collected_count, started_at, finished_at
                FROM collection_logs
                WHERE id = ?
                """,
                (log_id,),
            ).fetchone()
        return _log_from_row(row)

    def list_collection_logs(self, limit: int = 20) -> list[dict]:
        with get_connection() as connection:
            rows = connection.execute(
                """
                SELECT id, job_name, keyword_id, status, message, collected_count, started_at, finished_at
                FROM collection_logs
                WHERE job_name = 'news_collection'
                ORDER BY id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [_log_from_row(row) for row in rows]
