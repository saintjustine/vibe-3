from pathlib import Path
import os


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"
DATABASE_PATH = DATA_DIR / "app.db"
UPLOAD_DIR = DATA_DIR / "uploads"
EXPORT_DIR = DATA_DIR / "exports"
MANUAL_DIR = DATA_DIR / "manuals"

REQUIRED_DIRECTORIES = [DATA_DIR, UPLOAD_DIR, EXPORT_DIR, MANUAL_DIR]
NEWS_COLLECTION_INTERVAL_MINUTES = int(os.getenv("NEWS_COLLECTION_INTERVAL_MINUTES", "60"))
