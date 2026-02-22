"""Proxy service for kapaipai.tw API - ported from legacy/check_price.py."""
import requests

BASE_URL = "https://trade.kapaipai.tw/api/product/listProduct"
SEARCH_URL = "https://trade.kapaipai.tw/api/card/getFilteredList"
GAME = "pkmtw"

HEADERS = {
    "Host": "trade.kapaipai.tw",
    "Accept": "application/json, text/plain, */*",
    "User-Agent": (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
    ),
    "Referer": "https://trade.kapaipai.tw/card/pkmtw",
    "Accept-Language": "zh-TW,zh-Hant;q=0.9",
}

CONDITION_MAP = {
    "perfect": "完美品",
    "near_perfect": "近完美",
    "good": "良好",
    "fair": "普通",
    "poor": "差",
    "flawed": "瑕疵品",
}


def search_cards(name: str) -> list[dict]:
    """Search cards by name. Returns list of card variants."""
    params = {"game": GAME, "name": name}
    resp = requests.get(SEARCH_URL, params=params, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 0:
        raise ValueError(f"Search API error: {data.get('message', 'unknown')}")

    cards = data["data"]["list"]
    variants = []
    for card in cards:
        global_key = card["globalKey"]
        card_name = card["nameZh"]
        for r in card["rareList"]:
            variants.append({
                "card_key": global_key,
                "card_name": card_name,
                "pack_id": r["packId"],
                "pack_name": r["packName"],
                "pack_card_id": r["packCardId"],
                "rare": ", ".join(r["rare"]),
                "lowest_price": r["lowestPrice"],
                "avg_price": r["averagePrice"],
            })
    return variants


def fetch_products(card_key: str, rare: str,
                   pack_id: str | None = None,
                   pack_card_id: str | None = None) -> dict:
    """Fetch product listings from kapaipai API."""
    params = {
        "cardKey": card_key,
        "rare": rare,
        "pageSize": -1,
        "page": 1,
        "game": GAME,
    }
    if pack_id:
        params["packId"] = pack_id
    if pack_card_id:
        params["packCardId"] = pack_card_id

    resp = requests.get(BASE_URL, params=params, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 0:
        raise ValueError(f"Product API error: {data.get('msg', 'unknown')}")
    return data["data"]


def filter_buyable(products: list[dict], include_flawed: bool = False) -> list[dict]:
    """Filter products: active + stock >= 1, optionally only perfect condition."""
    results = []
    for p in products:
        if p["status"] != "active" or p["stock"] < 1:
            continue
        if not include_flawed and p["condition"] != "perfect":
            continue
        results.append({
            "price": int(p["price"]),
            "stock": p["stock"],
            "condition": p["condition"],
            "condition_label": CONDITION_MAP.get(p["condition"], p["condition"]),
            "seller_nickname": p["sellerNickname"],
            "seller_area": p["sellerArea"],
            "credit": p["credit"],
            "order_complete": p["orderComplete"],
            "pack_name": p.get("packName", ""),
        })
    return sorted(results, key=lambda x: (x["price"], -x["credit"]))


def get_price_summary(card_key: str, rare: str,
                      pack_id: str | None = None,
                      pack_card_id: str | None = None) -> dict:
    """Get full price summary for a card variant. Used by price checker service."""
    data = fetch_products(card_key, rare, pack_id, pack_card_id)
    products = data["products"]
    total = data["total"]
    buyable = filter_buyable(products)

    prices = [p["price"] for p in buyable]
    lowest = min(prices) if prices else None
    avg = sum(prices) / len(prices) if prices else None

    return {
        "total_count": total,
        "buyable_count": len(buyable),
        "lowest_price": lowest,
        "avg_price": round(avg, 2) if avg else None,
        "products": buyable,
    }
