"""Card search routes - proxy to kapaipai API."""
from flask import Blueprint, jsonify, request

from app.services.kapaipai import search_cards, fetch_products, filter_buyable

cards_bp = Blueprint("cards", __name__)


@cards_bp.route("/search")
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
            "buyable_count": len(buyable),
            "lowest_price": min(prices) if prices else None,
            "avg_price": round(sum(prices) / len(prices), 2) if prices else None,
        }
    })
