"""Multi-card search service — find sellers who stock ALL requested cards."""
from concurrent.futures import ThreadPoolExecutor, as_completed

from app.services.kapaipai import search_cards, fetch_products, filter_buyable


def multi_card_search(card_requests, max_workers=8):
    """Find sellers who have all requested cards with sufficient stock.

    Args:
        card_requests: [{"name": str, "quantity": int}, ...]
        max_workers: max concurrent threads for API calls

    Returns:
        {
            "sellers": [...],          # matching sellers sorted by total_cost
            "card_details": {...},     # per-card search metadata
            "stats": {...},            # summary statistics
        }
    """
    card_details = {}
    card_seller_map = {}  # card_name -> {seller_nick -> {products, total_stock, ...}}

    # Step 1: Search all card names concurrently
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(search_cards, req["name"]): req
            for req in card_requests
        }
        for future in as_completed(futures):
            req = futures[future]
            try:
                variants = future.result()
                card_details[req["name"]] = {
                    "variants_count": len(variants),
                    "variants": variants,
                    "error": None,
                }
            except Exception as e:
                card_details[req["name"]] = {
                    "variants_count": 0,
                    "variants": [],
                    "error": str(e),
                }

    # Step 2: For each card, fetch products for ALL variants concurrently
    fetch_tasks = []
    for req in card_requests:
        name = req["name"]
        if card_details[name]["error"]:
            continue
        for variant in card_details[name]["variants"]:
            fetch_tasks.append((name, variant))

    seller_by_card = {req["name"]: {} for req in card_requests}

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {}
        for card_name, variant in fetch_tasks:
            future = executor.submit(
                fetch_products,
                variant["card_key"],
                variant["rare"],
                variant.get("pack_id"),
                variant.get("pack_card_id"),
            )
            futures[future] = (card_name, variant)

        for future in as_completed(futures):
            card_name, variant = futures[future]
            try:
                data = future.result()
                buyable = filter_buyable(data["products"])
                for product in buyable:
                    seller = product["seller_nickname"]
                    if seller not in seller_by_card[card_name]:
                        seller_by_card[card_name][seller] = {
                            "products": [],
                            "total_stock": 0,
                            "seller_area": product["seller_area"],
                            "credit": product["credit"],
                            "order_complete": product["order_complete"],
                        }
                    entry = seller_by_card[card_name][seller]
                    entry["products"].append({
                        **product,
                        "card_name": variant.get("card_name", ""),
                        "card_key": variant.get("card_key", ""),
                        "pack_id": variant.get("pack_id", ""),
                        "pack_card_id": variant.get("pack_card_id", ""),
                        "variant_pack_name": variant.get("pack_name", ""),
                        "variant_rare": variant.get("rare", ""),
                    })
                    entry["total_stock"] += product["stock"]
            except Exception:
                pass  # skip failed variant fetches

    # Step 3: Cross-reference — find sellers in ALL cards with enough stock
    valid_names = [
        req["name"] for req in card_requests
        if not card_details[req["name"]].get("error")
    ]
    quantity_map = {req["name"]: req["quantity"] for req in card_requests}

    if not valid_names:
        return {
            "sellers": [],
            "card_details": _strip_card_details(card_details),
            "stats": {
                "total_sellers_scanned": 0,
                "matching_sellers": 0,
                "cards_requested": len(card_requests),
            },
        }

    seller_sets = [set(seller_by_card[name].keys()) for name in valid_names]
    common_sellers = set.intersection(*seller_sets) if seller_sets else set()

    matching_sellers = []
    for seller_nick in common_sellers:
        all_satisfied = True
        cards_info = {}
        total_cost = 0

        for card_name in valid_names:
            info = seller_by_card[card_name][seller_nick]
            qty_needed = quantity_map[card_name]

            if info["total_stock"] < qty_needed:
                all_satisfied = False
                break

            sorted_products = sorted(info["products"], key=lambda p: p["price"])

            # Greedy cheapest-first cost estimation
            remaining = qty_needed
            cost = 0
            for p in sorted_products:
                take = min(remaining, p["stock"])
                cost += take * p["price"]
                remaining -= take
                if remaining <= 0:
                    break

            total_cost += cost
            found_names = sorted(set(
                p.get("card_name", "") for p in sorted_products if p.get("card_name")
            ))
            cards_info[card_name] = {
                "total_stock": info["total_stock"],
                "lowest_price": sorted_products[0]["price"] if sorted_products else 0,
                "estimated_cost": cost,
                "products": sorted_products,
                "found_card_names": found_names,
            }

        if all_satisfied:
            # Use seller info from first card's data
            sample = seller_by_card[valid_names[0]][seller_nick]
            matching_sellers.append({
                "seller_nickname": seller_nick,
                "seller_area": sample.get("seller_area", ""),
                "credit": sample.get("credit", 0),
                "order_complete": sample.get("order_complete", 0),
                "cards": cards_info,
                "total_cost": total_cost,
            })

    matching_sellers.sort(key=lambda s: s["total_cost"])

    all_sellers = set().union(*seller_sets) if seller_sets else set()

    return {
        "sellers": matching_sellers,
        "card_details": _strip_card_details(card_details),
        "stats": {
            "total_sellers_scanned": len(all_sellers),
            "matching_sellers": len(matching_sellers),
            "cards_requested": len(card_requests),
        },
    }


def _strip_card_details(card_details):
    """Return card_details without the full variants list (too large for response)."""
    return {
        name: {
            "variants_count": info["variants_count"],
            "error": info.get("error"),
        }
        for name, info in card_details.items()
    }
