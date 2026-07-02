from threading import Event, Thread

from app.core.config import NEWS_COLLECTION_INTERVAL_MINUTES
from app.services.news_service import NewsService


_started = False
_stop_event = Event()


def start_news_collector() -> None:
    global _started
    if _started or NEWS_COLLECTION_INTERVAL_MINUTES <= 0:
        return

    _started = True
    thread = Thread(target=_run_loop, name="news-collector", daemon=True)
    thread.start()


def _run_loop() -> None:
    interval_seconds = NEWS_COLLECTION_INTERVAL_MINUTES * 60
    while not _stop_event.wait(interval_seconds):
        try:
            NewsService().collect()
        except Exception:
            # Collection failures are recorded per keyword when possible.
            # If there are no active keywords or setup is incomplete, keep the app running.
            continue
