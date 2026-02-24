import { useState, useCallback, useMemo } from "react";
import type { CardVariant } from "../types";
import { searchCards, addToWatchlist } from "../api/client";
import PriceAlertModal from "../components/PriceAlertModal";

function cardImageUrl(card: CardVariant): string {
  const rare = card.rare.split(", ")[0];
  return `https://static.kapaipai.tw/image/card/pkmtw/${encodeURIComponent(card.card_key)}/${encodeURIComponent(card.pack_id)}/${encodeURIComponent(card.pack_card_id)}/${encodeURIComponent(rare)}.jpg`;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardVariant[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [searched, setSearched] = useState(false);
  // Rarity filter: null = all selected, Set = only selected rarities shown
  const [rareFilter, setRareFilter] = useState<Set<string> | null>(null);

  const cardKey = (c: CardVariant) => `${c.card_key}|${c.rare}|${c.pack_id}`;

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    setSelected(new Set());
    setSearched(true);
    setRareFilter(null);
    try {
      const res = await searchCards(query.trim());
      setResults(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "搜尋失敗");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  function toggleSelect(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Extract unique rarities from results
  const uniqueRares = useMemo(() => {
    const rares: string[] = [];
    for (const card of results) {
      if (!rares.includes(card.rare)) {
        rares.push(card.rare);
      }
    }
    return rares;
  }, [results]);

  // Filtered results based on rarity selection
  const filteredResults = useMemo(() => {
    if (!rareFilter) return results;
    return results.filter((c) => rareFilter.has(c.rare));
  }, [results, rareFilter]);

  function toggleRare(rare: string) {
    setRareFilter((prev) => {
      // First click: show only this rarity
      if (!prev) return new Set([rare]);
      const next = new Set(prev);
      if (next.has(rare)) {
        next.delete(rare);
        // If empty, reset to show all
        if (next.size === 0) return null;
      } else {
        next.add(rare);
      }
      return next;
    });
  }

  function isRareSelected(rare: string): boolean {
    if (!rareFilter) return true;
    return rareFilter.has(rare);
  }

  function toggleAll() {
    if (selected.size === filteredResults.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredResults.map(cardKey)));
    }
  }

  const selectedCards = results.filter((c) => selected.has(cardKey(c)));

  async function handleAddToWatchlist(
    items: Array<CardVariant & { target_price: number }>,
  ) {
    setSubmitting(true);
    try {
      const payload = items.map((item) => ({
        card_key: item.card_key,
        card_name: item.card_name,
        pack_id: item.pack_id,
        pack_name: item.pack_name,
        pack_card_id: item.pack_card_id,
        rare: item.rare,
        target_price: item.target_price,
      }));
      const res = await addToWatchlist(payload);
      setModalOpen(false);
      setSelected(new Set());
      setToast(res.message);
      setTimeout(() => setToast(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "新增失敗");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h2 className="font-display font-bold text-2xl tracking-wide text-gray-900">
          單卡最低價
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          搜尋寶可夢卡牌並加入到價監控
        </p>
      </div>

      {/* Search bar */}
      <div className="card-frame p-4">
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
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="輸入卡牌名稱，例如：喵喵ex、噴火龍…"
              className="input-dark !pl-10"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="btn-gold whitespace-nowrap"
          >
            {searching ? (
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
              "搜尋"
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm shadow-xl">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
            {toast}
          </div>
        </div>
      )}

      {/* Rarity filter */}
      {results.length > 0 && uniqueRares.length > 1 && (
        <div className="card-frame px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 font-medium">
              稀有度篩選
            </span>
            <span className="text-xs text-gray-400">
              {uniqueRares.length} 種
            </span>
            {rareFilter && (
              <button
                onClick={() => setRareFilter(null)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-auto"
              >
                重設
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {uniqueRares.map((r) => {
              const sel = isRareSelected(r);
              return (
                <button
                  key={r}
                  onClick={() => toggleRare(r)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    sel
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      : "bg-gray-50 text-gray-400 border border-gray-200 line-through"
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Results */}
      {filteredResults.length > 0 && (
        <div className="card-frame animate-fade-in">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                找到{" "}
                <span className="text-amber-600 font-mono">
                  {filteredResults.length}
                </span>{" "}
                個結果
                {rareFilter && (
                  <span className="text-gray-400 ml-1">
                    (共 {results.length})
                  </span>
                )}
              </span>
              {selected.size > 0 && (
                <span className="badge bg-amber-50 text-amber-700 border border-amber-200">
                  已選 {selected.size}
                </span>
              )}
            </div>
            {selected.size > 0 && (
              <button
                onClick={() => setModalOpen(true)}
                className="btn-gold text-xs"
              >
                加入監控
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header w-10">
                    <input
                      type="checkbox"
                      checked={
                        selected.size === filteredResults.length &&
                        filteredResults.length > 0
                      }
                      onChange={toggleAll}
                      className="rounded border-gray-300 bg-white text-amber-500 focus:ring-amber-300 cursor-pointer"
                    />
                  </th>
                  <th className="table-header">卡圖</th>
                  <th className="table-header">卡牌名稱</th>
                  <th className="table-header">擴充包</th>
                  <th className="table-header">編號</th>
                  <th className="table-header">稀有度</th>
                  <th className="table-header text-right">最低價</th>
                  <th className="table-header text-right">均價</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredResults.map((card, i) => {
                  const key = cardKey(card);
                  const isSelected = selected.has(key);
                  return (
                    <tr
                      key={key}
                      onClick={() => toggleSelect(key)}
                      className={`cursor-pointer transition-colors duration-150 ${
                        isSelected ? "bg-amber-50/50" : "hover:bg-gray-50"
                      }`}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <td className="table-cell">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(key)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300 bg-white text-amber-500 focus:ring-amber-300 cursor-pointer"
                        />
                      </td>
                      <td className="table-cell">
                        <img
                          src={cardImageUrl(card)}
                          alt={card.card_name}
                          className="w-32 object-contain rounded border border-gray-200"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </td>
                      <td className="table-cell font-medium text-gray-800">
                        {card.card_name}
                      </td>
                      <td className="table-cell text-gray-500">
                        <span className="text-gray-700">{card.pack_name}</span>
                        <span className="text-gray-400 ml-1">
                          ({card.pack_id})
                        </span>
                      </td>
                      <td className="table-cell font-mono text-gray-500 text-xs">
                        {card.pack_card_id}
                      </td>
                      <td className="table-cell">
                        <span className="badge badge-rare">{card.rare}</span>
                      </td>
                      <td className="table-cell text-right font-mono">
                        {card.lowest_price != null ? (
                          <span className="text-amber-600">
                            ${card.lowest_price}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="table-cell text-right font-mono text-gray-500">
                        {card.avg_price != null ? `$${card.avg_price}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {searched && !searching && filteredResults.length === 0 && !error && (
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
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <p className="text-gray-500">
            {rareFilter
              ? "篩選後沒有結果，試試放寬稀有度篩選"
              : "找不到相關卡牌"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {rareFilter ? "點擊「重設」顯示所有結果" : "請嘗試其他關鍵字"}
          </p>
        </div>
      )}

      {/* Modal */}
      <PriceAlertModal
        cards={selectedCards}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddToWatchlist}
        loading={submitting}
      />
    </div>
  );
}
