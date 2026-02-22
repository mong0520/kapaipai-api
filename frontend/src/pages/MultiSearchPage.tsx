import { useState } from "react";
import type { MultiSearchCardRequest, MultiSearchResult, SellerMatch, SellerCardDetail } from "../types";
import { multiCardSearch } from "../api/client";

type SortKey = "total_cost" | "credit" | "order_complete";

function cardImageUrlFromDetail(detail: SellerCardDetail): string | null {
  const p = detail.products[0];
  if (!p?.card_key || !p?.pack_id || !p?.pack_card_id || !p?.variant_rare) return null;
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
  const [expandedSellers, setExpandedSellers] = useState<Set<string>>(new Set());
  const [searched, setSearched] = useState(false);

  function addTag() {
    const name = inputValue.trim();
    if (!name) return;
    if (tags.some((t) => t.name.toLowerCase() === name.toLowerCase())) return;
    if (tags.length >= 10) return;
    setTags([...tags, { name, quantity: 1 }]);
    setInputValue("");
  }

  function removeTag(index: number) {
    setTags(tags.filter((_, i) => i !== index));
  }

  function updateQuantity(index: number, delta: number) {
    setTags(
      tags.map((t, i) =>
        i === index ? { ...t, quantity: Math.max(1, Math.min(99, t.quantity + delta)) } : t
      )
    );
  }

  async function handleSearch() {
    if (tags.length < 1) return;
    setLoading(true);
    setError("");
    setSearched(true);
    setExpandedSellers(new Set());
    try {
      const res = await multiCardSearch(tags);
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h2 className="font-display font-bold text-2xl tracking-wide text-gray-100">
          多卡搜尋
        </h2>
        <p className="text-sm text-gray-500 mt-1">
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vault-800 border border-vault-600/50 text-sm animate-slide-up"
              >
                <span className="text-gray-200 font-medium">{tag.name}</span>
                <span className="flex items-center gap-0.5 ml-1">
                  <button
                    onClick={() => updateQuantity(i, -1)}
                    className="w-5 h-5 rounded bg-vault-700 text-gray-400 hover:text-gray-200 hover:bg-vault-600 flex items-center justify-center text-xs transition-colors"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-mono text-gold-400 text-xs">
                    {tag.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(i, 1)}
                    className="w-5 h-5 rounded bg-vault-700 text-gray-400 hover:text-gray-200 hover:bg-vault-600 flex items-center justify-center text-xs transition-colors"
                  >
                    +
                  </button>
                </span>
                <button
                  onClick={() => removeTag(i)}
                  className="ml-1 text-gray-600 hover:text-red-400 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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
            disabled={!inputValue.trim() || tags.length >= 10}
            className="btn-ghost whitespace-nowrap"
          >
            新增
          </button>
          <button
            onClick={handleSearch}
            disabled={loading || tags.length < 1}
            className="btn-gold whitespace-nowrap"
          >
            {loading ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              "搜尋共同賣家"
            )}
          </button>
        </div>

      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card-frame p-8 text-center animate-fade-in">
          <svg className="animate-spin w-8 h-8 text-gold-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400">正在搜尋共同賣家…</p>
          <p className="text-xs text-gray-600 mt-1">
            搜尋 {tags.length} 張卡牌的所有版本，可能需要 10-30 秒
          </p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4 animate-fade-in">
          {/* Stats bar */}
          <div className="card-frame px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-400">
                  掃描{" "}
                  <span className="font-mono text-gray-300">
                    {result.stats.total_sellers_scanned}
                  </span>{" "}
                  位賣家
                </span>
                <span className="text-gray-400">
                  找到{" "}
                  <span className="font-mono text-gold-400">
                    {result.stats.matching_sellers}
                  </span>{" "}
                  位符合
                </span>
              </div>
              {/* Sort controls */}
              {result.sellers.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-600">排序：</span>
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
                          ? "bg-gold-500/15 text-gold-400 border border-gold-500/20"
                          : "text-gray-500 hover:text-gray-300 border border-transparent"
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
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
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

          {/* Card variants summary */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(result.card_details).map(([name, detail]) => (
              <span
                key={name}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs ${
                  detail.error
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-vault-800 text-gray-400 border border-vault-600/30"
                }`}
              >
                <span className="text-gray-300">{name}</span>
                {!detail.error && (
                  <span className="font-mono text-gray-500">
                    {detail.variants_count} 版本
                  </span>
                )}
              </span>
            ))}
          </div>

          {/* Seller cards */}
          {sortedSellers(result.sellers).map((seller, i) => (
            <div
              key={seller.seller_nickname}
              className="card-frame animate-slide-up overflow-hidden"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Seller header */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b border-vault-700/50 cursor-pointer hover:bg-vault-800/30 transition-colors"
                onClick={() => toggleExpanded(seller.seller_nickname)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-gray-200 font-medium truncate">
                    {seller.seller_nickname}
                  </span>
                  {seller.seller_area && (
                    <span className="text-xs text-gray-500 shrink-0">
                      {seller.seller_area}
                    </span>
                  )}
                  <span className="badge bg-vault-700 text-gray-400 shrink-0">
                    信用 {seller.credit}
                  </span>
                  <span className="badge bg-vault-700 text-gray-400 shrink-0">
                    成交 {seller.order_complete}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-lg text-gold-400 font-bold">
                    ${seller.total_cost}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                      expandedSellers.has(seller.seller_nickname) ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>

              {/* Per-card breakdown */}
              {Object.entries(seller.cards).map(([cardName, detail]) => (
                <div
                  key={cardName}
                  className="px-4 py-2.5 border-b border-vault-700/20 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const imgUrl = cardImageUrlFromDetail(detail);
                        return imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={cardName}
                            className="w-16 object-contain rounded border border-vault-600/50"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : null;
                      })()}
                      <span className="text-sm text-gray-300">
                        {detail.found_card_names?.length
                          ? detail.found_card_names.join("、")
                          : cardName}
                      </span>
                      <span className="text-xs text-gray-600">
                        x{tags.find((t) => t.name === cardName)?.quantity ?? 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-gray-500">
                        庫存{" "}
                        <span className="font-mono text-gray-300">
                          {detail.total_stock}
                        </span>
                      </span>
                      <span className="text-gray-500">
                        最低{" "}
                        <span className="font-mono text-gold-400">
                          ${detail.lowest_price}
                        </span>
                      </span>
                      <span className="text-gray-500">
                        小計{" "}
                        <span className="font-mono text-emerald-400">
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
                          className="flex items-center justify-between py-1.5 px-3 rounded bg-vault-800/50 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={`https://static.kapaipai.tw/image/card/pkmtw/${encodeURIComponent(product.card_key)}/${encodeURIComponent(product.pack_id)}/${encodeURIComponent(product.pack_card_id)}/${encodeURIComponent(product.variant_rare.split(", ")[0])}.jpg`}
                              alt={product.card_name}
                              className="w-12 object-contain rounded border border-vault-600/50"
                              loading="lazy"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                            <span className="badge badge-rare text-[10px]">
                              {product.variant_rare}
                            </span>
                            <span className="text-gray-400">
                              {product.variant_pack_name}
                            </span>
                            <span className="text-gray-500">
                              {product.condition_label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-500">
                              庫存{" "}
                              <span className="font-mono text-gray-300">
                                {product.stock}
                              </span>
                            </span>
                            <span className="font-mono text-gold-400">
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
          {result.sellers.length === 0 && (
            <div className="card-frame p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-vault-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                </svg>
              </div>
              <p className="text-gray-500">沒有找到同時擁有所有指定卡牌的賣家</p>
              <p className="text-xs text-gray-600 mt-1">
                試試減少卡牌數量或放寬數量需求
              </p>
            </div>
          )}
        </div>
      )}

      {/* Initial empty state */}
      {!searched && !loading && tags.length === 0 && (
        <div className="card-frame p-12 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-vault-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </div>
          <p className="text-gray-500">在上方輸入多張卡牌名稱開始搜尋</p>
          <p className="text-xs text-gray-600 mt-1">
            系統會找出同時擁有所有卡牌的賣家，讓你一次買齊省運費
          </p>
        </div>
      )}
    </div>
  );
}
