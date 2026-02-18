#!/usr/bin/env python3
"""
Kapaipai Card Price Checker
Query card prices from trade.kapaipai.tw and display buyable listings.

Usage:
    # Search by card name (interactive selection)
    python check_price.py -n "喵喵ex"

    # Direct query with card key + rarity
    python check_price.py -k "喵喵ex-170-殺手鐧捕捉-夾尾巴逃跑" -r RR
    python check_price.py -k "喵喵ex-170-殺手鐧捕捉-夾尾巴逃跑" -p M3 -c 061 -r RR
"""

import argparse
import json
import sys
from collections import Counter

import requests
from prettytable import PrettyTable

BASE_URL = "https://trade.kapaipai.tw/api/product/listProduct"
SEARCH_URL = "https://trade.kapaipai.tw/api/card/getFilteredList"
GAME = "pkmtw"

HEADERS = {
    "Host": "trade.kapaipai.tw",
    "Accept": "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) "
                  "AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
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
    """Search cards by name using getFilteredList API."""
    params = {"game": GAME, "name": name}
    resp = requests.get(SEARCH_URL, params=params, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 0:
        print(f"Error: Search API returned code {data.get('code')}: {data.get('message', 'unknown')}",
              file=sys.stderr)
        sys.exit(1)
    return data["data"]["list"]


def select_card_variant(cards: list[dict], rare_filter: str | None = None,
                        interactive: bool = False) -> tuple[str, str, str, str]:
    """Display search results and let user pick a variant.
    If interactive is True, always prompt user to pick.
    If rare_filter is provided, auto-select the first matching variant.
    If rare_filter is None, auto-select the first variant.
    Returns (card_key, rare, pack_id, pack_card_id).
    """
    if not cards:
        print("No cards found.", file=sys.stderr)
        sys.exit(1)

    # Flatten all variants into a numbered list
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

    # Display search results
    table = PrettyTable()
    table.field_names = ["#", "Card", "Pack", "Card#", "Rare", "Lowest", "Avg"]
    table.align["#"] = "r"
    table.align["Card"] = "l"
    table.align["Pack"] = "l"
    table.align["Card#"] = "l"
    table.align["Rare"] = "l"
    table.align["Lowest"] = "r"
    table.align["Avg"] = "r"

    for i, v in enumerate(variants, 1):
        table.add_row([
            i,
            v["card_name"],
            f"{v['pack_name']} ({v['pack_id']})",
            v["pack_card_id"],
            v["rare"],
            f"{v['lowest_price']}元" if v["lowest_price"] else "-",
            f"{v['avg_price']}元" if v["avg_price"] else "-",
        ])

    print()
    print(f"  Search Results ({len(variants)} variants found)")
    print(table)

    # Interactive mode: always prompt user
    if interactive:
        while True:
            try:
                choice = input(f"\n  Select variant [1-{len(variants)}]: ").strip()
                idx = int(choice) - 1
                if 0 <= idx < len(variants):
                    v = variants[idx]
                    return v["card_key"], v["rare"], v["pack_id"], v["pack_card_id"]
                print(f"  Please enter a number between 1 and {len(variants)}")
            except (ValueError, EOFError):
                print(f"  Please enter a number between 1 and {len(variants)}")
            except KeyboardInterrupt:
                print()
                sys.exit(0)

    # Auto-select by -r filter
    if rare_filter:
        matched = [v for v in variants if v["rare"].upper() == rare_filter.upper()]
        if matched:
            v = matched[0]
            print(f"  Auto-selected by rare={rare_filter.upper()}: "
                  f"{v['card_name']} ({v['pack_id']}-{v['pack_card_id']}) [{v['rare']}]")
            return v["card_key"], v["rare"], v["pack_id"], v["pack_card_id"]
        else:
            print(f"  Warning: No variant with rare={rare_filter.upper()} found, using first result.",
                  file=sys.stderr)

    # No -r filter: auto-select first variant
    v = variants[0]
    print(f"  Auto-selected: {v['card_name']} ({v['pack_id']}-{v['pack_card_id']}) [{v['rare']}]")
    return v["card_key"], v["rare"], v["pack_id"], v["pack_card_id"]


def fetch_products(card_key: str, rare: str,
                   pack_id: str | None = None, pack_card_id: str | None = None) -> dict:
    """Fetch product listings from kapaipai API (public API, no auth needed)."""
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
    return resp.json()


def filter_buyable(products: list[dict], include_flawed: bool = False) -> list[dict]:
    """Filter products: active + stock >= 1, optionally exclude non-perfect condition."""
    results = []
    for p in products:
        if p["status"] != "active" or p["stock"] < 1:
            continue
        if not include_flawed and p["condition"] != "perfect":
            continue
        results.append(p)
    return results


def print_summary(card_key: str, rare: str, total: int, buyable: list[dict],
                  pack_id: str | None = None, pack_card_id: str | None = None):
    """Print a pretty summary of buyable products."""
    pack_name = buyable[0]["packName"] if buyable else "N/A"
    prices = sorted(int(p["price"]) for p in buyable)

    pack_info = f"{pack_name} ({pack_id})" if pack_id else pack_name
    card_info = f"Card#: {pack_card_id} | " if pack_card_id else ""

    print("=" * 70)
    print(f"  Kapaipai Price Check")
    print("=" * 70)
    print(f"  Card     : {card_key}")
    print(f"  Pack     : {pack_info} | {card_info}Rare: {rare}")
    print(f"  Total    : {total} listings")
    print(f"  Buyable  : {len(buyable)} listings (active + in-stock + perfect)")
    print("-" * 70)

    if not prices:
        print("  No buyable products found.")
        return

    avg_price = sum(prices) / len(prices)
    median_price = prices[len(prices) // 2]

    print(f"  Min: {min(prices)} | Max: {max(prices)} | "
          f"Avg: {avg_price:.0f} | Median: {median_price}")
    print("-" * 70)

    # Price distribution
    brackets = [(0, 50), (51, 100), (101, 150), (151, 200),
                (201, 300), (301, 500), (501, 99999)]
    labels = ["≤50", "51-100", "101-150", "151-200", "201-300", "301-500", "500+"]
    print("  Price Distribution:")
    for (lo, hi), label in zip(brackets, labels):
        count = sum(1 for p in prices if lo <= p <= hi)
        if count > 0:
            bar = "█" * count
            print(f"    {label:>8}: {bar} ({count})")
    print("-" * 70)

    # Area distribution
    areas = Counter(p["sellerArea"] for p in buyable)
    print("  Seller Area (top 5):")
    for area, cnt in areas.most_common(5):
        print(f"    {area}: {cnt}")
    print("-" * 70)

    # Product listing table
    sorted_products = sorted(buyable, key=lambda x: (int(x["price"]), -x["credit"]))

    table = PrettyTable()
    table.field_names = ["#", "Price", "Stock", "Condition", "Seller", "Area", "Credit", "Done"]
    table.align["#"] = "r"
    table.align["Price"] = "r"
    table.align["Stock"] = "r"
    table.align["Condition"] = "l"
    table.align["Seller"] = "l"
    table.align["Area"] = "l"
    table.align["Credit"] = "r"
    table.align["Done"] = "r"

    for i, p in enumerate(sorted_products, 1):
        table.add_row([
            i,
            f"{int(p['price'])}元",
            f"x{p['stock']}",
            CONDITION_MAP.get(p["condition"], p["condition"]),
            p["sellerNickname"][:18],
            p["sellerArea"],
            f"{p['credit']:,}",
            p["orderComplete"],
        ])

    print(table)


def main():
    parser = argparse.ArgumentParser(
        description="Kapaipai Card Price Checker",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  # Search mode
  python check_price.py -n "喵喵ex"
  python check_price.py -n "喵喵ex" -r SAR
  python check_price.py -n "喵喵ex" -i          # interactive selection

  # Direct mode
  python check_price.py -k "喵喵ex-170-殺手鐧捕捉-夾尾巴逃跑" -r RR
  python check_price.py -k "喵喵ex-170-殺手鐧捕捉-夾尾巴逃跑" -p M3 -c 061 -r RR
""",
    )
    parser.add_argument("-n", "--name", default=None, help="Search card by name (interactive mode)")
    parser.add_argument("-k", "--card-key", default=None, help="Card key (globalKey)")
    parser.add_argument("-p", "--pack-id", default=None, help="Pack ID (e.g. M3)")
    parser.add_argument("-c", "--pack-card-id", default=None, help="Pack card ID (e.g. 061)")
    search_select = parser.add_mutually_exclusive_group()
    search_select.add_argument("-r", "--rare", default=None, help="Rarity (e.g. RR, SR, SAR, UR)")
    search_select.add_argument("-i", "--interactive", action="store_true", help="Force interactive selection (mutually exclusive with -r)")
    parser.add_argument("--include-flawed", action="store_true", help="Include non-perfect condition cards")
    parser.add_argument("--json", action="store_true", help="Output raw JSON instead of pretty print")

    args = parser.parse_args()

    # Validate: must provide either -n or (-k and -r)
    if not args.name and not (args.card_key and args.rare):
        parser.error("Either -n/--name (search mode) or -k/--card-key + -r/--rare (direct mode) is required")

    # Search mode: lookup by name, then let user pick variant
    if args.name:
        try:
            cards = search_cards(args.name)
        except requests.RequestException as e:
            print(f"Error: Failed to search cards: {e}", file=sys.stderr)
            sys.exit(1)

        card_key, rare, pack_id, pack_card_id = select_card_variant(cards, args.rare, args.interactive)
    else:
        card_key = args.card_key
        rare = args.rare
        pack_id = args.pack_id
        pack_card_id = args.pack_card_id

    # Fetch and display price data
    try:
        data = fetch_products(card_key, rare, pack_id, pack_card_id)
    except requests.RequestException as e:
        print(f"Error: Failed to fetch data from API: {e}", file=sys.stderr)
        sys.exit(1)

    if data.get("code") != 0:
        print(f"Error: API returned code {data.get('code')}: {data.get('msg', 'unknown')}", file=sys.stderr)
        sys.exit(1)

    products = data["data"]["products"]
    total = data["data"]["total"]
    buyable = filter_buyable(products, include_flawed=args.include_flawed)

    if args.json:
        json.dump(buyable, sys.stdout, ensure_ascii=False, indent=2)
        print()
    else:
        print_summary(card_key, rare, total, buyable, pack_id, pack_card_id)


if __name__ == "__main__":
    main()
