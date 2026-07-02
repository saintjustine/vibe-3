from pydantic import BaseModel, Field, field_validator


class NewsKeywordCreate(BaseModel):
    keyword: str = Field(min_length=1, max_length=120)
    is_active: bool = True

    @field_validator("keyword", mode="before")
    @classmethod
    def strip_keyword(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class NewsKeywordUpdate(NewsKeywordCreate):
    pass


class NewsKeyword(BaseModel):
    id: int
    keyword: str
    is_active: bool
    created_at: str
    updated_at: str


class NewsArticle(BaseModel):
    id: int
    keyword_id: int | None
    keyword: str | None
    title: str
    source: str | None
    url: str
    published_at: str | None
    collected_at: str
    summary: str | None
    content: str | None


class CollectionLog(BaseModel):
    id: int
    job_name: str
    keyword_id: int | None
    status: str
    message: str | None
    collected_count: int
    started_at: str | None
    finished_at: str | None


class NewsCollectionResponse(BaseModel):
    fetched_count: int = 0
    collected_count: int
    duplicate_count: int = 0
    failed_count: int = 0
    logs: list[CollectionLog]
