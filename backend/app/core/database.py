import sqlite3
from pathlib import Path

from app.core.config import DATABASE_PATH, REQUIRED_DIRECTORIES


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    department TEXT,
    role TEXT NOT NULL DEFAULT 'member',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    schedule_type TEXT NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    is_all_day INTEGER NOT NULL DEFAULT 0,
    location TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed',
    memo TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS excel_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_type TEXT NOT NULL,
    original_filename TEXT,
    result_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    row_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manuals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    file_path TEXT,
    content_text TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chatbot_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    source_manual_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_manual_id) REFERENCES manuals (id)
);

CREATE TABLE IF NOT EXISTS news_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword_id INTEGER,
    title TEXT NOT NULL,
    source TEXT,
    url TEXT UNIQUE,
    published_at TEXT,
    collected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    keyword TEXT,
    summary TEXT,
    content TEXT,
    FOREIGN KEY (keyword_id) REFERENCES news_keywords (id)
);

CREATE TABLE IF NOT EXISTS news_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collection_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_name TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    collected_count INTEGER NOT NULL DEFAULT 0,
    keyword_id INTEGER,
    started_at TEXT,
    finished_at TEXT,
    FOREIGN KEY (keyword_id) REFERENCES news_keywords (id)
);
"""

MIGRATION_SQL = [
    "ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE schedules ADD COLUMN is_all_day INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE schedules ADD COLUMN location TEXT",
    "ALTER TABLE schedules ADD COLUMN status TEXT NOT NULL DEFAULT 'confirmed'",
    "ALTER TABLE news_articles ADD COLUMN keyword_id INTEGER",
    "ALTER TABLE news_articles ADD COLUMN content TEXT",
    "ALTER TABLE collection_logs ADD COLUMN collected_count INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE collection_logs ADD COLUMN keyword_id INTEGER",
]


def ensure_directories() -> None:
    for directory in REQUIRED_DIRECTORIES:
        directory.mkdir(parents=True, exist_ok=True)


def get_connection() -> sqlite3.Connection:
    ensure_directories()
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database() -> None:
    with get_connection() as connection:
        connection.executescript(SCHEMA_SQL)
        for statement in MIGRATION_SQL:
            try:
                connection.execute(statement)
            except sqlite3.OperationalError as exc:
                if "duplicate column name" not in str(exc).lower():
                    raise
        connection.commit()


def check_database() -> dict:
    with get_connection() as connection:
        sqlite_version = connection.execute("SELECT sqlite_version()").fetchone()[0]
        table_rows = connection.execute(
            """
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name NOT LIKE 'sqlite_%'
            ORDER BY name
            """
        ).fetchall()

    return {
        "status": "ok",
        "sqlite_version": sqlite_version,
        "path": str(Path(DATABASE_PATH).resolve()),
        "tables": [row["name"] for row in table_rows],
    }
