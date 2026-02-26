"""Watchlist CRUD routes."""
from flask import Blueprint, jsonify, request, g

from app.extensions import db
from app.models import WatchlistItem, User
from app.services.price_checker import check_single_item
from app.auth import login_required

watchlist_bp = Blueprint("watchlist", __name__)


@watchlist_bp.route("", methods=["GET"])
@login_required
def list_items():
    """List all watchlist items with latest price snapshot.

    GET /api/watchlist
    """
    items = WatchlistItem.query.filter_by(user_id=g.current_user.id).order_by(
        WatchlistItem.created_at.desc()
    ).all()

    return jsonify({
        "data": [item.to_dict(include_latest_snapshot=True) for item in items]
    })


@watchlist_bp.route("", methods=["POST"])
@login_required
def add_items():
    """Add item(s) to watchlist.

    POST /api/watchlist
    Body: { "items": [{ "card_key", "card_name", "pack_id", "pack_name",
                        "pack_card_id", "rare", "target_price" }] }
    """
    body = request.get_json()
    if not body or "items" not in body:
        return jsonify({"error": "items array is required"}), 400

    created = []
    for item_data in body["items"]:
        required = ["card_key", "card_name", "rare", "target_price"]
        missing = [f for f in required if f not in item_data]
        if missing:
            return jsonify({"error": f"Missing fields: {missing}"}), 400

        # Check for duplicate
        existing = WatchlistItem.query.filter_by(
            user_id=g.current_user.id,
            card_key=item_data["card_key"],
            rare=item_data["rare"],
            pack_id=item_data.get("pack_id"),
        ).first()

        if existing:
            # Update target price if already exists
            existing.target_price = item_data["target_price"]
            existing.target_price_min = item_data.get("target_price_min", 0)
            existing.is_active = True
            created.append(existing)
            continue

        item = WatchlistItem(
            user_id=g.current_user.id,
            card_key=item_data["card_key"],
            card_name=item_data["card_name"],
            pack_id=item_data.get("pack_id"),
            pack_name=item_data.get("pack_name"),
            pack_card_id=item_data.get("pack_card_id"),
            rare=item_data["rare"],
            target_price=item_data["target_price"],
            target_price_min=item_data.get("target_price_min", 0),
        )
        db.session.add(item)
        created.append(item)

    db.session.commit()

    return jsonify({
        "data": [item.to_dict() for item in created],
        "message": f"{len(created)} item(s) added/updated",
    }), 201


@watchlist_bp.route("/<int:item_id>", methods=["PATCH"])
@login_required
def update_item(item_id):
    """Update target_price or is_active.

    PATCH /api/watchlist/:id
    Body: { "target_price": 100 } or { "is_active": false }
    """
    item = WatchlistItem.query.filter_by(id=item_id, user_id=g.current_user.id).first()
    if not item:
        return jsonify({"error": "Item not found"}), 404

    body = request.get_json()
    if "target_price" in body:
        item.target_price = body["target_price"]
    if "target_price_min" in body:
        item.target_price_min = body["target_price_min"]
    if "is_active" in body:
        item.is_active = body["is_active"]

    db.session.commit()

    return jsonify({"data": item.to_dict(include_latest_snapshot=True)})


@watchlist_bp.route("/<int:item_id>", methods=["DELETE"])
@login_required
def delete_item(item_id):
    """Remove item from watchlist.

    DELETE /api/watchlist/:id
    """
    item = WatchlistItem.query.filter_by(id=item_id, user_id=g.current_user.id).first()
    if not item:
        return jsonify({"error": "Item not found"}), 404

    db.session.delete(item)
    db.session.commit()

    return jsonify({"message": "Item deleted"})


@watchlist_bp.route("/<int:item_id>/check", methods=["POST"])
@login_required
def check_item(item_id):
    """Manually trigger price check for one item.

    POST /api/watchlist/:id/check
    """
    item = WatchlistItem.query.filter_by(id=item_id, user_id=g.current_user.id).first()
    if not item:
        return jsonify({"error": "Item not found"}), 404

    snapshot = check_single_item(item)
    db.session.commit()

    if snapshot:
        return jsonify({
            "data": item.to_dict(include_latest_snapshot=True),
            "snapshot": snapshot.to_dict(),
        })
    else:
        return jsonify({"error": "Failed to check price"}), 502
