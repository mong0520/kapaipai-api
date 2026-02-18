"""APScheduler setup for periodic price checking."""
import logging
import os

from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def init_scheduler(app):
    """Initialize the scheduler with the Flask app context."""
    # Skip in testing or when reloader spawns a child process
    if app.config.get("TESTING") or os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        # Only run scheduler in the main process (not the reloader)
        pass

    if os.environ.get("WERKZEUG_RUN_MAIN") != "true" and not app.debug:
        _start_scheduler(app)
    elif os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        _start_scheduler(app)


def _start_scheduler(app):
    interval = app.config.get("PRICE_CHECK_INTERVAL_MINUTES", 10)

    def job():
        with app.app_context():
            from app.services.price_checker import check_all_active_items
            check_all_active_items()

    scheduler.add_job(
        job,
        "interval",
        minutes=interval,
        id="price_check",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started: price check every %d minutes", interval)
