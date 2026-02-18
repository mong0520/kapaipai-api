"""Notification history routes."""
from flask import Blueprint, jsonify, request

from app.models import Notification, WatchlistItem

notifications_bp = Blueprint("notifications", __name__)

DEFAULT_USER_ID = 1


@notifications_bp.route("", methods=["GET"])
def list_notifications():
    """Get notification history.

    GET /api/notifications?limit=50
    """
    limit = request.args.get("limit", 50, type=int)

    notifications = (
        Notification.query
        .join(WatchlistItem)
        .filter(WatchlistItem.user_id == DEFAULT_USER_ID)
        .order_by(Notification.sent_at.desc())
        .limit(limit)
        .all()
    )

    return jsonify({
        "data": [n.to_dict() for n in notifications]
    })
