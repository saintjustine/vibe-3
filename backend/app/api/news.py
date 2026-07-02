from fastapi import APIRouter, Query

from app.schemas.news import (
    CollectionLog,
    NewsArticle,
    NewsCollectionResponse,
    NewsKeyword,
    NewsKeywordCreate,
    NewsKeywordUpdate,
)
from app.services.news_service import NewsService


router = APIRouter(prefix="/news", tags=["news"])
service = NewsService()


@router.get("/keywords", response_model=dict[str, list[NewsKeyword]])
def list_keywords(active: bool | None = Query(default=None)) -> dict:
    return {"items": service.list_keywords(active=active)}


@router.post("/keywords", response_model=NewsKeyword, status_code=201)
def create_keyword(payload: NewsKeywordCreate) -> dict:
    return service.create_keyword(payload)


@router.put("/keywords/{keyword_id}", response_model=NewsKeyword)
def update_keyword(keyword_id: int, payload: NewsKeywordUpdate) -> dict:
    return service.update_keyword(keyword_id, payload)


@router.delete("/keywords/{keyword_id}")
def delete_keyword(keyword_id: int) -> dict:
    return service.delete_keyword(keyword_id)


@router.get("/articles", response_model=dict[str, list[NewsArticle]])
def list_articles(
    keyword_id: int | None = Query(default=None),
    query: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
) -> dict:
    return {
        "items": service.list_articles(
            keyword_id=keyword_id,
            query=query,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
        )
    }


@router.post("/collect", response_model=NewsCollectionResponse)
def collect_news(
    keyword_id: int | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
) -> dict:
    return service.collect(keyword_id=keyword_id, date_from=date_from, date_to=date_to)


@router.get("/logs", response_model=dict[str, list[CollectionLog]])
def list_collection_logs(limit: int = Query(default=20, ge=1, le=100)) -> dict:
    return {"items": service.list_collection_logs(limit=limit)}
