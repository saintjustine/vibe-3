from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from html.parser import HTMLParser
from urllib.parse import quote_plus
from urllib.request import Request, urlopen
from xml.etree import ElementTree

from fastapi import HTTPException, status

from app.repositories.news_repository import NewsRepository
from app.schemas.news import NewsKeywordCreate


class _HTMLTextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        text = data.strip()
        if text:
            self.parts.append(text)

    def get_text(self) -> str:
        return " ".join(self.parts)


class NewsService:
    def __init__(self, repository: NewsRepository | None = None) -> None:
        self.repository = repository or NewsRepository()

    def list_keywords(self, active: bool | None = None) -> list[dict]:
        return self.repository.list_keywords(active=active)

    def create_keyword(self, payload: NewsKeywordCreate) -> dict:
        try:
            return self.repository.create_keyword(payload)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    def update_keyword(self, keyword_id: int, payload: NewsKeywordCreate) -> dict:
        try:
            keyword = self.repository.update_keyword(keyword_id, payload)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
        if keyword is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Keyword not found.")
        return keyword

    def delete_keyword(self, keyword_id: int) -> dict:
        if not self.repository.delete_keyword(keyword_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Keyword not found.")
        return {"deleted": True}

    def list_articles(
        self,
        *,
        keyword_id: int | None = None,
        query: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        limit: int = 50,
    ) -> list[dict]:
        normalized_from, normalized_to = _validate_date_range(date_from, date_to)
        return self.repository.list_articles(
            keyword_id=keyword_id,
            query=query,
            date_from=normalized_from,
            date_to=normalized_to,
            limit=limit,
        )

    def list_collection_logs(self, limit: int = 20) -> list[dict]:
        return self.repository.list_collection_logs(limit=limit)

    def collect(
        self,
        keyword_id: int | None = None,
        *,
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> dict:
        normalized_from, normalized_to = _validate_date_range(date_from, date_to)
        if keyword_id is None:
            keywords = self.repository.list_keywords(active=True)
        else:
            keyword = self.repository.get_keyword(keyword_id)
            if keyword is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Keyword not found.")
            keywords = [keyword]

        if not keywords:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active keywords to collect.")

        total = 0
        logs = []
        for keyword in keywords:
            started_at = _now_iso()
            try:
                articles = self._fetch_google_news(
                    keyword["keyword"],
                    date_from=normalized_from,
                    date_to=normalized_to,
                )
                created_count = 0
                for article in articles:
                    created = self.repository.create_article(
                        {
                            **article,
                            "keyword_id": keyword["id"],
                            "keyword": keyword["keyword"],
                        }
                    )
                    if created is not None:
                        created_count += 1

                total += created_count
                logs.append(
                    self.repository.create_collection_log(
                        keyword_id=keyword["id"],
                        status="success",
                        message=_collection_message(len(articles), created_count, normalized_from, normalized_to),
                        collected_count=created_count,
                        started_at=started_at,
                        finished_at=_now_iso(),
                    )
                )
            except Exception as exc:
                logs.append(
                    self.repository.create_collection_log(
                        keyword_id=keyword["id"],
                        status="failed",
                        message=str(exc),
                        collected_count=0,
                        started_at=started_at,
                        finished_at=_now_iso(),
                    )
                )

        return {"collected_count": total, "logs": logs}

    def _fetch_google_news(
        self,
        keyword: str,
        *,
        date_from: str | None = None,
        date_to: str | None = None,
        limit: int = 10,
    ) -> list[dict]:
        search_terms = [keyword]
        if date_from:
            search_terms.append(f"after:{date_from}")
        if date_to:
            exclusive_to = date.fromisoformat(date_to) + timedelta(days=1)
            search_terms.append(f"before:{exclusive_to.isoformat()}")
        query = " ".join(search_terms)
        url = (
            "https://news.google.com/rss/search?"
            f"q={quote_plus(query)}&hl=ko&gl=KR&ceid=KR:ko"
        )
        request = Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; PublicAdminNewsCollector/0.1)",
            },
        )
        with urlopen(request, timeout=12) as response:
            xml_text = response.read()

        root = ElementTree.fromstring(xml_text)
        items = root.findall("./channel/item")
        articles: list[dict] = []

        for item in items[:limit]:
            title = _node_text(item, "title")
            link = _node_text(item, "link")
            description = _clean_html(_node_text(item, "description"))
            source_node = item.find("source")
            source = source_node.text.strip() if source_node is not None and source_node.text else None
            published_at = _parse_pub_date(_node_text(item, "pubDate"))

            if not title or not link:
                continue

            content = description or title
            articles.append(
                {
                    "title": unescape(title),
                    "source": source,
                    "url": link,
                    "published_at": published_at,
                    "summary": _summarize(content),
                    "content": content,
                }
            )

        return articles


def _node_text(item: ElementTree.Element, name: str) -> str:
    node = item.find(name)
    return node.text.strip() if node is not None and node.text else ""


def _clean_html(value: str) -> str:
    parser = _HTMLTextExtractor()
    parser.feed(unescape(value))
    return " ".join(parser.get_text().split())


def _summarize(content: str) -> str:
    text = " ".join(content.split())
    if not text:
        return ""

    sentences = [part.strip() for part in text.replace("!", ".").replace("?", ".").split(".") if part.strip()]
    summary = ". ".join(sentences[:3])
    if summary:
        summary = f"{summary}."
    return summary[:500]


def _parse_pub_date(value: str) -> str | None:
    if not value:
        return None
    try:
        return parsedate_to_datetime(value).astimezone(timezone.utc).isoformat()
    except (TypeError, ValueError):
        return value


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _validate_date_range(date_from: str | None, date_to: str | None) -> tuple[str | None, str | None]:
    start = _parse_date(date_from, "date_from") if date_from else None
    end = _parse_date(date_to, "date_to") if date_to else None
    if start and end and end < start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_to must be the same as or later than date_from.",
        )
    return (start.isoformat() if start else None, end.isoformat() if end else None)


def _parse_date(value: str, field_name: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must be a YYYY-MM-DD date string.",
        ) from exc


def _collection_message(
    fetched_count: int,
    created_count: int,
    date_from: str | None,
    date_to: str | None,
) -> str:
    range_text = ""
    if date_from or date_to:
        range_text = f" for {date_from or 'start'} to {date_to or 'today'}"
    return f"Fetched {fetched_count} articles{range_text}, saved {created_count} new articles."
