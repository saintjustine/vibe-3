from fastapi import APIRouter

from app.core.database import check_database, initialize_database

router = APIRouter()


@router.get("/health")
def health_check() -> dict:
    initialize_database()

    return {
        "status": "ok",
        "service": "public-admin-super-app-api",
        "version": "0.1.0",
        "database": check_database(),
        "modules": ["schedule", "excel", "chatbot", "news"],
    }


@router.get("/schedules")
def list_schedules() -> dict:
    return {
        "items": [],
        "message": "Schedule module scaffold is ready.",
    }


@router.get("/excel/jobs")
def list_excel_jobs() -> dict:
    return {
        "items": [],
        "message": "Excel automation module scaffold is ready.",
    }


@router.get("/manuals")
def list_manuals() -> dict:
    return {
        "items": [],
        "message": "Complaint manual module scaffold is ready.",
    }


@router.get("/news")
def list_news() -> dict:
    return {
        "items": [],
        "message": "News collection module scaffold is ready.",
    }
