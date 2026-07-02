from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.database import initialize_database
from app.jobs.news_collector import start_news_collector


def create_app() -> FastAPI:
    app = FastAPI(
        title="Public Administration Super App API",
        version="0.1.0",
        description="Scaffold API for schedule, excel automation, chatbot, and news modules.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def on_startup() -> None:
        initialize_database()
        start_news_collector()

    app.include_router(router, prefix="/api")
    return app


app = create_app()
