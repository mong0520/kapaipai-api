"""Price checker service - scheduled and manual price checking."""
import logging
from datetime import datetime, timezone

from app.extensions import db
from app.models import WatchlistItem, PriceSnapshot, Notification
from app.services.kapaipai import get_price_summary, card_image_url
from app.services.notifier import send_line_message

logger = logging.getLogger(__name__)


def check_single_item(item: WatchlistItem) -> PriceSnapshot | None:
    """Check price for a single watchlist item, save snapshot, and notify if needed.

    Returns the created PriceSnapshot or None on error.
    """
    try:
        summary = get_price_summary(
            item.card_key, item.rare, item.pack_id, item.pack_card_id
        )
    except Exception as e:
        logger.error("Failed to fetch price for item %d (%s): %s", item.id, item.card_name, e)
        return None

    snapshot = PriceSnapshot(
        watchlist_item_id=item.id,
        lowest_price=summary["lowest_price"],
        avg_price=summary["avg_price"],
        buyable_count=summary["buyable_count"],
        total_count=summary["total_count"],
        checked_at=datetime.now(timezone.utc),
    )
    db.session.add(snapshot)
    db.session.flush()

    # Check if we should notify
    if summary["lowest_price"] is not None and summary["lowest_price"] <= item.target_price:
        _maybe_notify(item, summary["lowest_price"])

    return snapshot


def _maybe_notify(item: WatchlistItem, current_price: int):
    """Send notification if not already notified at this price."""
    # Check last notification for this item
    last_notif = (
        Notification.query
        .filter_by(watchlist_item_id=item.id)
        .order_by(Notification.sent_at.desc())
        .first()
    )

    # Don't re-send if already notified at same triggered price AND target price unchanged
    if (
        last_notif
        and last_notif.triggered_price == current_price
        and last_notif.target_price == item.target_price
    ):
        logger.info(
            "Skip notification for item %d (%s) - already notified at %d with target %d",
            item.id, item.card_name, current_price, item.target_price,
        )
        return

    pack_info = f"{item.pack_name} ({item.pack_id})" if item.pack_id else ""
    message = (
        f"🔔 Price Alert!\n"
        f"Card: {item.card_name}\n"
        f"Pack: {pack_info}\n"
        f"Rare: {item.rare}\n"
        f"Current Price: {current_price} TWD\n"
        f"Target Price: {item.target_price} TWD\n"
        f"💰 Price has reached your target!"
    )

    # Get LINE user_id from the user record
    line_user_id = item.user.line_user_id if item.user else None
    img_url = card_image_url(item.card_key, item.pack_id, item.pack_card_id, item.rare)
    success = send_line_message(message, user_id=line_user_id, image_url=img_url)

    notif = Notification(
        watchlist_item_id=item.id,
        triggered_price=current_price,
        target_price=item.target_price,
        message=message,
        status="sent" if success else "failed",
        sent_at=datetime.now(timezone.utc),
    )
    db.session.add(notif)


def check_all_active_items():
    """Check prices for all active watchlist items. Called by scheduler."""
    items = WatchlistItem.query.filter_by(is_active=True).all()
    logger.info("Scheduled price check: %d active items", len(items))

    for item in items:
        check_single_item(item)

    db.session.commit()
    logger.info("Scheduled price check completed")
