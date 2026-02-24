import { useState, useMemo } from "react";
import type {
  MultiSearchCardRequest,
  MultiSearchResult,
  SellerMatch,
  SellerCardDetail,
} from "../types";
import { multiCardSearch } from "../api/client";

type SortKey = "total_cost" | "credit" | "order_complete";

function cardImageUrlFromDetail(detail: SellerCardDetail): string | null {
  const p = detail.products[0];
  if (!p?.card_key || !p?.pack_id || !p?.pack_card_id || !p?.variant_rare)
    return null;
  const rare = p.variant_rare.split(", ")[0];
  return `https://static.kapaipai.tw/image/card/pkmtw/${encodeURIComponent(p.card_key)}/${encodeURIComponent(p.pack_id)}/${encodeURIComponent(p.pack_card_id)}/${encodeURIComponent(rare)}.jpg`;
}

export default function MultiSearchPage() {
  const [tags, setTags] = useState<MultiSearchCardRequest[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [result, setResult] = useState<MultiSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("total_cost");
  const [expandedSellers, setExpandedSellers] = useState<Set<string>>(
    new Set(),
  );
  const [searched, setSearched] = useState(false);
  // Pack filter: cardName -> Set of selected pack_id (absent = all selected)
  const [packFilters, setPackFilters] = useState<Record<string, Set<string>>>(
    {},
  );
  // Rarity filter: cardName -> Set of selected rare strings (absent = all selected)
  const [rareFilters, setRareFilters] = useState<Record<string, Set<string>>>(
    {},
  );

  function addTag() {
    const name = inputValue.trim();
    if (!name) return;
    if (tags.some((t) => t.name.toLowerCase() === name.toLowerCase())) return;
    if (tags.length >= 10) return;
    const newTags = [...tags, { name, quantity: 1 }];
    setTags(newTags);
    setInputValue("");
    doSearch(newTags);
  }

  function removeTag(index: number) {
    setTags(tags.filter((_, i) => i !== index));
  }

  function updateQuantity(index: number, delta: number) {
    setTags(
      tags.map((t, i) =>
        i === index
          ? { ...t, quantity: Math.max(1, Math.min(99, t.quantity + delta)) }
          : t,
      ),
    );
  }

  async function doSearch(searchTags: MultiSearchCardRequest[]) {
    if (searchTags.length < 1) return;
    setLoading(true);
    setError("");
    setSearched(true);
    setExpandedSellers(new Set());
    setPackFilters({});
    setRareFilters({});
    try {
      const res = await multiCardSearch(searchTags);
      setResult(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "搜尋失敗");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpanded(nickname: string) {
    setExpandedSellers((prev) => {
      const next = new Set(prev);
      if (next.has(nickname)) next.delete(nickname);
      else next.add(nickname);
      return next;
    });
  }

  // Extract unique packs per card from ALL sellers' product data
  const packsByCard = useMemo(() => {
    if (!result) return {};
    const map: Record<string, { pack_id: string; pack_name: string }[]> = {};
    for (const seller of result.sellers) {
      for (const [cardName, detail] of Object.entries(seller.cards)) {
        if (!map[cardName]) map[cardName] = [];
        for (const p of detail.products) {
          if (!map[cardName].some((pk) => pk.pack_id === p.pack_id)) {
            map[cardName].push({
              pack_id: p.pack_id,
              pack_name: p.variant_pack_name,
            });
          }
        }
      }
    }
    return map;
  }, [result]);

  // Extract unique rarities per card from ALL sellers' product data
  const raresByCard = useMemo(() => {
    if (!result) return {};
    const map: Record<string, string[]> = {};
    for (const seller of result.sellers) {
      for (const [cardName, detail] of Object.entries(seller.cards)) {
        if (!map[cardName]) map[cardName] = [];
        for (const p of detail.products) {
          if (!map[cardName].includes(p.variant_rare)) {
            map[cardName].push(p.variant_rare);
          }
        }
      }
    }
    return map;
  }, [result]);

  function togglePack(cardName: string, packId: string) {
    setPackFilters((prev) => {
      const allPacks = (packsByCard[cardName] || []).map((p) => p.pack_id);
      const current = prev[cardName] ?? new Set(allPacks);
      const next = new Set(current);
      if (next.has(packId)) {
        next.delete(packId);
        if (next.size === 0) return prev;
      } else {
        next.add(packId);
      }
      return { ...prev, [cardName]: next };
    });
  }

  function toggleRare(cardName: string, rare: string) {
    setRareFilters((prev) => {
      // First click on this card: show only this rarity
      if (!prev[cardName]) return { ...prev, [cardName]: new Set([rare]) };
      const next = new Set(prev[cardName]);
      if (next.has(rare)) {
        next.delete(rare);
        // If empty, reset to show all
        if (next.size === 0) {
          const updated = { ...prev };
          delete updated[cardName];
          return updated;
        }
      } else {
        next.add(rare);
      }
      return { ...prev, [cardName]: next };
    });
  }

  function isPackSelected(cardName: string, packId: string): boolean {
    if (!packFilters[cardName]) return true;
    return packFilters[cardName].has(packId);
  }

  function isRareSelected(cardName: string, rare: string): boolean {
    if (!rareFilters[cardName]) return true;
    return rareFilters[cardName].has(rare);
  }

  function hasActiveFilter(): boolean {
    return (
      Object.keys(packFilters).length > 0 || Object.keys(rareFilters).length > 0
    );
  }

  function resetCardFilters(cardName: string) {
    setPackFilters((prev) => {
      const next = { ...prev };
      delete next[cardName];
      return next;
    });
    setRareFilters((prev) => {
      const next = { ...prev };
      delete next[cardName];
      return next;
    });
  }

  // Filter sellers based on pack + rarity selection (intersection), recalculate costs
  const filteredSellers = useMemo(() => {
    if (!result) return [];
    if (!hasActiveFilter()) return result.sellers;

    const quantityMap: Record<string, number> = {};
    for (const t of tags) quantityMap[t.name] = t.quantity;

    const filtered: SellerMatch[] = [];
    for (const seller of result.sellers) {
      let allSatisfied = true;
      const newCards: Record<string, SellerCardDetail> = {};
      let totalCost = 0;

      for (const [cardName, detail] of Object.entries(seller.cards)) {
        const packSet = packFilters[cardName];
        const rareSet = rareFilters[cardName];
        // Filter products: must match both pack AND rarity
        const prods = detail.products.filter((p) => {
          if (packSet && !packSet.has(p.pack_id)) return false;
          if (rareSet && !rareSet.has(p.variant_rare)) return false;
          return true;
        });

        const stock = prods.reduce((s, p) => s + p.stock, 0);
        const qtyNeeded = quantityMap[cardName] ?? 1;

        if (stock < qtyNeeded) {
          allSatisfied = false;
          break;
        }

        const sorted = [...prods].sort((a, b) => a.price - b.price);
        let remaining = qtyNeeded;
        let cost = 0;
        for (const p of sorted) {
          const take = Math.min(remaining, p.stock);
          cost += take * p.price;
          remaining -= take;
          if (remaining <= 0) break;
        }

        totalCost += cost;
        const foundNames = [
          ...new Set(sorted.map((p) => p.card_name).filter(Boolean)),
        ].sort();
        newCards[cardName] = {
          total_stock: stock,
          lowest_price: sorted[0]?.price ?? 0,
          estimated_cost: cost,
          products: sorted,
          found_card_names: foundNames,
        };
      }

      if (allSatisfied) {
        filtered.push({ ...seller, cards: newCards, total_cost: totalCost });
      }
    }
    return filtered;
  }, [result, packFilters, rareFilters, tags]);

  function sortedSellers(sellers: SellerMatch[]): SellerMatch[] {
    return [...sellers].sort((a, b) => {
      if (sortBy === "total_cost") return a.total_cost - b.total_cost;
      if (sortBy === "credit") return b.credit - a.credit;
      return b.order_complete - a.order_complete;
    });
  }

  const hasErrors = result?.card_details
    ? Object.values(result.card_details).some((d) => d.error)
    : false;

  const displaySellers = sortedSellers(filteredSellers);

  // Determine which cards have filter options (multiple packs or multiple rarities)
  const filterableCards = useMemo(() => {
    const cards: string[] = [];
    for (const cardName of Object.keys(packsByCard)) {
      const packs = packsByCard[cardName] || [];
      const rares = raresByCard[cardName] || [];
      if (packs.length > 1 || rares.length > 1) {
        cards.push(cardName);
      }
    }
    return cards;
  }, [packsByCard, raresByCard]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h2 className="font-display font-bold text-2xl tracking-wide text-gray-900">
          多卡一起買
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          搜尋同時擁有多張指定卡牌的賣家，一次買齊省運費
        </p>
      </div>

      {/* Tag input area */}
      <div className="card-frame p-4 space-y-3">
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, i) => (
              <span
                key={tag.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-sm animate-slide-up"
              >
                <span className="text-gray-800 font-medium">{tag.name}</span>
                <span className="flex items-center gap-0.5 ml-1">
                  <button
                    onClick={() => updateQuantity(i, -1)}
                    className="w-5 h-5 rounded bg-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-300 flex items-center justify-center text-xs transition-colors"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-mono text-amber-600 text-xs">
                    {tag.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(i, 1)}
                    className="w-5 h-5 rounded bg-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-300 flex items-center justify-center text-xs transition-colors"
                  >
                    +
                  </button>
                </span>
                <button
                  onClick={() => removeTag(i)}
                  className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder={
                tags.length === 0
                  ? "輸入卡牌名稱後按 Enter 新增，例如：喵喵ex"
                  : "繼續新增卡牌…"
              }
              className="input-dark !pl-10"
              disabled={tags.length >= 10}
            />
          </div>
          <button
            onClick={addTag}
            disabled={!inputValue.trim() || tags.length >= 10 || loading}
            className="btn-ghost whitespace-nowrap"
          >
            新增
          </button>
          <button
            onClick={() => doSearch(tags)}
            disabled={loading || tags.length < 1}
            className="btn-gold whitespace-nowrap"
          >
            {loading ? (
              <svg
                className="animate-spin w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              "搜尋共同賣家"
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card-frame p-8 text-center animate-fade-in">
          <svg
            className="animate-spin w-8 h-8 text-amber-500 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-gray-500">正在搜尋共同賣家…</p>
          <p className="text-xs text-gray-400 mt-1">
            搜尋 {tags.length} 張卡牌的所有版本，可能需要 10-30 秒
          </p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4 animate-fade-in">
          {/* Stats bar */}
          <div className="card-frame px-4 py-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500">
                  掃描{" "}
                  <span className="font-mono text-gray-700">
                    {result.stats.total_sellers_scanned}
                  </span>{" "}
                  位賣家
                </span>
                <span className="text-gray-500">
                  找到{" "}
                  <span className="font-mono text-amber-600">
                    {displaySellers.length}
                  </span>{" "}
                  位符合
                  {hasActiveFilter() && (
                    <span className="text-gray-400 ml-1">
                      (原 {result.stats.matching_sellers})
                    </span>
                  )}
                </span>
              </div>
              {/* Sort controls */}
              {displaySellers.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-400">排序：</span>
                  {(
                    [
                      ["total_cost", "總價"],
                      ["credit", "信用"],
                      ["order_complete", "成交"],
                    ] as [SortKey, string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setSortBy(key)}
                      className={`px-2 py-1 rounded transition-colors ${
                        sortBy === key
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "text-gray-500 hover:text-gray-700 border border-transparent"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card details / errors */}
          {hasErrors && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-300 text-yellow-700 text-sm">
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"
                />
              </svg>
              <span>
                部分卡牌搜尋失敗：
                {Object.entries(result.card_details)
                  .filter(([, d]) => d.error)
                  .map(([name, d]) => `${name} (${d.error})`)
                  .join("、")}
              </span>
            </div>
          )}

          {/* Pack + Rarity filters per card */}
          {filterableCards.map((cardName) => {
            const packs = packsByCard[cardName] || [];
            const rares = raresByCard[cardName] || [];
            const hasCardFilter =
              !!packFilters[cardName] || !!rareFilters[cardName];
            return (
              <div key={cardName} className="card-frame px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 font-medium">
                    {cardName}
                  </span>
                  <span className="text-xs text-gray-400">
                    {packs.length} 擴充包 · {rares.length} 稀有度
                  </span>
                  {hasCardFilter && (
                    <button
                      onClick={() => resetCardFilters(cardName)}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-auto"
                    >
                      重設
                    </button>
                  )}
                </div>
                {/* Pack filter row */}
                {packs.length > 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-gray-400 w-12 shrink-0">
                      擴充包
                    </span>
                    {packs.map((pk) => {
                      const selected = isPackSelected(cardName, pk.pack_id);
                      return (
                        <button
                          key={pk.pack_id}
                          onClick={() => togglePack(cardName, pk.pack_id)}
                          className={`px-2.5 py-1 rounded text-xs transition-colors ${
                            selected
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-gray-50 text-gray-400 border border-gray-200 line-through"
                          }`}
                        >
                          {pk.pack_name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* Rarity filter row */}
                {rares.length > 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-gray-400 w-12 shrink-0">
                      稀有度
                    </span>
                    {rares.map((r) => {
                      const selected = isRareSelected(cardName, r);
                      return (
                        <button
                          key={r}
                          onClick={() => toggleRare(cardName, r)}
                          className={`px-2.5 py-1 rounded text-xs transition-colors ${
                            selected
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : "bg-gray-50 text-gray-400 border border-gray-200 line-through"
                          }`}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Seller cards */}
          {displaySellers.map((seller, i) => (
            <div
              key={seller.seller_nickname}
              className="card-frame animate-slide-up overflow-hidden"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Seller header */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpanded(seller.seller_nickname)}
              >
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-wrap">
                  <span className="text-gray-800 font-medium truncate">
                    {seller.seller_nickname}
                  </span>
                  {seller.seller_area && (
                    <span className="text-xs text-gray-400 shrink-0">
                      {seller.seller_area}
                    </span>
                  )}
                  <span className="badge bg-gray-100 text-gray-500 shrink-0 hidden md:inline-flex">
                    信用 {seller.credit}
                  </span>
                  <span className="badge bg-gray-100 text-gray-500 shrink-0 hidden md:inline-flex">
                    成交 {seller.order_complete}
                  </span>
                </div>
                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                  <span className="font-mono text-base md:text-lg text-amber-600 font-bold">
                    ${seller.total_cost}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                      expandedSellers.has(seller.seller_nickname)
                        ? "rotate-180"
                        : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </div>
              </div>

              {/* Per-card breakdown */}
              {Object.entries(seller.cards).map(([cardName, detail]) => (
                <div
                  key={cardName}
                  className="px-4 py-2.5 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const imgUrl = cardImageUrlFromDetail(detail);
                        return imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={cardName}
                            className="w-16 md:w-32 object-contain rounded border border-gray-200"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : null;
                      })()}
                      <div>
                        <span className="text-sm text-gray-700">
                          {detail.found_card_names?.length
                            ? detail.found_card_names.join("、")
                            : cardName}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">
                          x
                          {tags.find((t) => t.name === cardName)?.quantity ?? 1}
                        </span>
                        {/* Mobile-only inline stats */}
                        <div className="flex items-center gap-3 text-xs mt-1 md:hidden">
                          <span className="text-gray-500">
                            庫存{" "}
                            <span className="font-mono text-gray-700">
                              {detail.total_stock}
                            </span>
                          </span>
                          <span className="text-gray-500">
                            最低{" "}
                            <span className="font-mono text-amber-600">
                              ${detail.lowest_price}
                            </span>
                          </span>
                          <span className="text-gray-500">
                            小計{" "}
                            <span className="font-mono text-emerald-600">
                              ${detail.estimated_cost}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Desktop-only stats */}
                    <div className="hidden md:flex items-center gap-4 text-xs">
                      <span className="text-gray-500">
                        庫存{" "}
                        <span className="font-mono text-gray-700">
                          {detail.total_stock}
                        </span>
                      </span>
                      <span className="text-gray-500">
                        最低{" "}
                        <span className="font-mono text-amber-600">
                          ${detail.lowest_price}
                        </span>
                      </span>
                      <span className="text-gray-500">
                        小計{" "}
                        <span className="font-mono text-emerald-600">
                          ${detail.estimated_cost}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Expanded product details */}
                  {expandedSellers.has(seller.seller_nickname) && (
                    <div className="mt-2 space-y-1">
                      {detail.products.map((product, j) => (
                        <div
                          key={j}
                          className="flex flex-col md:flex-row md:items-center md:justify-between py-1.5 px-3 rounded bg-gray-50 text-xs gap-1 md:gap-0"
                        >
                          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                            <span className="badge badge-rare text-[10px]">
                              {product.variant_rare}
                            </span>
                            <span className="text-gray-500">
                              {product.variant_pack_name}
                            </span>
                            <span className="text-gray-400">
                              {product.condition_label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-500">
                              庫存{" "}
                              <span className="font-mono text-gray-700">
                                {product.stock}
                              </span>
                            </span>
                            <span className="font-mono text-amber-600">
                              ${product.price}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Empty result */}
          {displaySellers.length === 0 && (
            <div className="card-frame p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
                  />
                </svg>
              </div>
              <p className="text-gray-500">
                {hasActiveFilter()
                  ? "篩選後沒有符合的賣家，試試放寬擴充包或稀有度篩選"
                  : "沒有找到同時擁有所有指定卡牌的賣家"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                試試減少卡牌數量或放寬數量需求
              </p>
            </div>
          )}
        </div>
      )}

      {/* Initial empty state */}
      {!searched && !loading && tags.length === 0 && (
        <div className="card-frame p-12 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
              />
            </svg>
          </div>
          <p className="text-gray-500">在上方輸入多張卡牌名稱開始搜尋</p>
          <p className="text-xs text-gray-400 mt-1">
            系統會找出同時擁有所有卡牌的賣家，讓你一次買齊省運費
          </p>
        </div>
      )}
    </div>
  );
}
