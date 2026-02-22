"""Card search routes - proxy to kapaipai API."""
from flask import Blueprint, jsonify, request

from app.services.kapaipai import search_cards, fetch_products, filter_buyable
from app.services.multi_search import multi_card_search
from app.auth import login_required

cards_bp = Blueprint("cards", __name__)


@cards_bp.route("/search")
@login_required
def search():
    """Search cards by name.

    GET /api/cards/search?name=喵喵ex
    """
    name = request.args.get("name", "").strip()
    if not name:
        return jsonify({"error": "name parameter is required"}), 400

    try:
        variants = search_cards(name)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    return jsonify({"data": variants, "total": len(variants)})


@cards_bp.route("/products")
@login_required
def products():
    """Get product listings for a specific card variant.

    GET /api/cards/products?cardKey=...&rare=RR&packId=M3&packCardId=061
    """
    card_key = request.args.get("cardKey", "").strip()
    rare = request.args.get("rare", "").strip()
    if not card_key or not rare:
        return jsonify({"error": "cardKey and rare parameters are required"}), 400

    pack_id = request.args.get("packId")
    pack_card_id = request.args.get("packCardId")

    try:
        data = fetch_products(card_key, rare, pack_id, pack_card_id)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    buyable = filter_buyable(data["products"])
    prices = [p["price"] for p in buyable]

    return jsonify({
        "data": {
            "products": buyable,
            "total": data["total"],
            "buyable_count": sum(p["stock"] for p in buyable),
            "lowest_price": min(prices) if prices else None,
            "avg_price": round(sum(prices) / len(prices), 2) if prices else None,
        }
    })


@cards_bp.route("/multi-search", methods=["POST"])
@login_required
def multi_search():
    """Find sellers who have ALL specified cards with sufficient stock.

    POST /api/cards/multi-search
    Body: {"cards": [{"name": "喵喵ex", "quantity": 2}, ...]}
    """
    data = request.get_json()
    if not data or not data.get("cards"):
        return jsonify({"error": "cards array is required"}), 400

    cards = data["cards"]
    if len(cards) > 10:
        return jsonify({"error": "Maximum 10 cards per search"}), 400

    for card in cards:
        if not card.get("name", "").strip():
            return jsonify({"error": "Each card must have a name"}), 400
        card["name"] = card["name"].strip()
        card["quantity"] = max(1, min(99, int(card.get("quantity", 1))))

    try:
        result = multi_card_search(cards)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

    return jsonify({"data": result})
