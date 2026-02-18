import { useState, useCallback } from "react";
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

  const cardKey = (c: CardVariant) => `${c.card_key}|${c.rare}|${c.pack_id}`;

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    setSelected(new Set());
    setSearched(true);
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

  function toggleAll() {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map(cardKey)));
    }
  }

  const selectedCards = results.filter((c) => selected.has(cardKey(c)));

  async function handleAddToWatchlist(items: Array<CardVariant & { target_price: number }>) {
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
        <h2 className="font-display font-bold text-2xl tracking-wide text-gray-100">
          卡牌搜尋
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          搜尋寶可夢卡牌並加入到價監控
        </p>
      </div>

      {/* Search bar */}
      <div className="card-frame p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
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
          <button onClick={handleSearch} disabled={searching || !query.trim()} className="btn-gold whitespace-nowrap">
            {searching ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              "搜尋"
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm shadow-xl">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {toast}
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="card-frame animate-fade-in">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-vault-700/50">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                找到 <span className="text-gold-400 font-mono">{results.length}</span> 個結果
              </span>
              {selected.size > 0 && (
                <span className="badge bg-gold-500/15 text-gold-400 border border-gold-500/20">
                  已選 {selected.size}
                </span>
              )}
            </div>
            {selected.size > 0 && (
              <button onClick={() => setModalOpen(true)} className="btn-gold text-xs">
                加入監控
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-vault-700/30">
                  <th className="table-header w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === results.length && results.length > 0}
                      onChange={toggleAll}
                      className="rounded border-vault-500 bg-vault-800 text-gold-500 focus:ring-gold-500/30 cursor-pointer"
                    />
                  </th>
                  <th className="table-header w-14">卡圖</th>
                  <th className="table-header">卡牌名稱</th>
                  <th className="table-header">擴充包</th>
                  <th className="table-header">編號</th>
                  <th className="table-header">稀有度</th>
                  <th className="table-header text-right">最低價</th>
                  <th className="table-header text-right">均價</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vault-700/20">
                {results.map((card, i) => {
                  const key = cardKey(card);
                  const isSelected = selected.has(key);
                  return (
                    <tr
                      key={key}
                      onClick={() => toggleSelect(key)}
                      className={`cursor-pointer transition-colors duration-150 ${
                        isSelected
                          ? "bg-gold-500/5"
                          : "hover:bg-vault-800/50"
                      }`}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <td className="table-cell">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(key)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-vault-500 bg-vault-800 text-gold-500 focus:ring-gold-500/30 cursor-pointer"
                        />
                      </td>
                      <td className="table-cell">
                        <img
                          src={cardImageUrl(card)}
                          alt={card.card_name}
                          className="w-14 object-contain rounded border border-vault-600/50"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </td>
                      <td className="table-cell font-medium text-gray-200">
                        {card.card_name}
                      </td>
                      <td className="table-cell text-gray-400">
                        <span className="text-gray-300">{card.pack_name}</span>
                        <span className="text-gray-600 ml-1">({card.pack_id})</span>
                      </td>
                      <td className="table-cell font-mono text-gray-400 text-xs">
                        {card.pack_card_id}
                      </td>
                      <td className="table-cell">
                        <span className="badge badge-rare">{card.rare}</span>
                      </td>
                      <td className="table-cell text-right font-mono">
                        {card.lowest_price != null ? (
                          <span className="text-gold-400">${card.lowest_price}</span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="table-cell text-right font-mono text-gray-400">
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
      {searched && !searching && results.length === 0 && !error && (
        <div className="card-frame p-12 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-vault-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <p className="text-gray-500">找不到相關卡牌</p>
          <p className="text-xs text-gray-600 mt-1">請嘗試其他關鍵字</p>
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
