"""Notification history routes."""
from flask import Blueprint, jsonify, request, g

from app.models import Notification, WatchlistItem
from app.auth import login_required

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("", methods=["GET"])
@login_required
def list_notifications():
    """Get notification history.

    GET /api/notifications?limit=50
    """
    limit = request.args.get("limit", 50, type=int)

    notifications = (
        Notification.query
        .join(WatchlistItem)
        .filter(WatchlistItem.user_id == g.current_user.id)
        .order_by(Notification.sent_at.desc())
        .limit(limit)
        .all()
    )

    return jsonify({
        "data": [n.to_dict() for n in notifications]
    })
