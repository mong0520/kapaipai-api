import { useState, useEffect, useCallback } from "react";
import type { WatchlistItem } from "../types";
import {
  getWatchlist,
  updateWatchlistItem,
  deleteWatchlistItem,
  checkWatchlistItem,
} from "../api/client";

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<Set<number>>(new Set());
  const [editingPrice, setEditingPrice] = useState<{ id: number; value: string } | null>(null);
  const [error, setError] = useState("");

  const fetchItems = useCallback(async () => {
    try {
      const res = await getWatchlist();
      setItems(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function handleToggle(item: WatchlistItem) {
    try {
      const res = await updateWatchlistItem(item.id, { is_active: !item.is_active });
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? res.data : i))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新失敗");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteWatchlistItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "刪除失敗");
    }
  }

  async function handleCheck(id: number) {
    setChecking((prev) => new Set(prev).add(id));
    try {
      const res = await checkWatchlistItem(id);
      setItems((prev) =>
        prev.map((i) => (i.id === id ? res.data : i))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "查詢失敗");
    } finally {
      setChecking((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handlePriceUpdate(id: number, value: string) {
    const price = parseInt(value, 10);
    if (isNaN(price) || price <= 0) {
      setEditingPrice(null);
      return;
    }
    try {
      const res = await updateWatchlistItem(id, { target_price: price });
      setItems((prev) =>
        prev.map((i) => (i.id === id ? res.data : i))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新失敗");
    }
    setEditingPrice(null);
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString("zh-TW", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin w-6 h-6 text-gold-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-2xl tracking-wide text-gray-100">
            監控清單
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            管理你的卡牌到價通知
          </p>
        </div>
        <button onClick={fetchItems} className="btn-ghost flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          重新整理
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
          <button onClick={() => setError("")} className="ml-auto text-red-400/60 hover:text-red-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card-frame p-12 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-vault-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-500">尚未加入任何監控卡牌</p>
          <p className="text-xs text-gray-600 mt-1">前往「卡牌搜尋」新增你想監控的卡牌</p>
        </div>
      ) : (
        <div className="card-frame animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-vault-700/30">
                  <th className="table-header">狀態</th>
                  <th className="table-header">卡牌名稱</th>
                  <th className="table-header">擴充包</th>
                  <th className="table-header">稀有度</th>
                  <th className="table-header text-right">目標價</th>
                  <th className="table-header text-right">目前最低</th>
                  <th className="table-header text-right">賣家數</th>
                  <th className="table-header">最後檢查</th>
                  <th className="table-header text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vault-700/20">
                {items.map((item) => {
                  const snap = item.latest_snapshot;
                  const priceHit = snap?.lowest_price != null && snap.lowest_price <= item.target_price;
                  const isChecking = checking.has(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors duration-150 ${
                        priceHit ? "bg-emerald-500/5" : "hover:bg-vault-800/50"
                      }`}
                    >
                      {/* Status toggle */}
                      <td className="table-cell">
                        <button
                          onClick={() => handleToggle(item)}
                          className="flex items-center gap-2 group cursor-pointer"
                          title={item.is_active ? "點擊暫停" : "點擊啟用"}
                        >
                          <div
                            className={`w-2 h-2 rounded-full transition-colors ${
                              item.is_active
                                ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]"
                                : "bg-red-400/60"
                            }`}
                          />
                          <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors">
                            {item.is_active ? "啟用" : "暫停"}
                          </span>
                        </button>
                      </td>

                      {/* Card name */}
                      <td className="table-cell font-medium text-gray-200">
                        {item.card_name}
                      </td>

                      {/* Pack */}
                      <td className="table-cell text-gray-400 text-xs">
                        {item.pack_name}
                        {item.pack_id && (
                          <span className="text-gray-600 ml-1">({item.pack_id})</span>
                        )}
                      </td>

                      {/* Rare */}
                      <td className="table-cell">
                        <span className="badge badge-rare">{item.rare}</span>
                      </td>

                      {/* Target price */}
                      <td className="table-cell text-right">
                        {editingPrice?.id === item.id ? (
                          <input
                            type="number"
                            autoFocus
                            value={editingPrice.value}
                            onChange={(e) =>
                              setEditingPrice({ id: item.id, value: e.target.value })
                            }
                            onBlur={() =>
                              handlePriceUpdate(item.id, editingPrice.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handlePriceUpdate(item.id, editingPrice.value);
                              if (e.key === "Escape") setEditingPrice(null);
                            }}
                            className="input-dark w-20 !py-1 text-sm text-right font-mono"
                          />
                        ) : (
                          <button
                            onClick={() =>
                              setEditingPrice({
                                id: item.id,
                                value: String(item.target_price),
                              })
                            }
                            className="inline-flex items-center gap-1.5 font-mono text-gold-400 hover:text-gold-300 cursor-pointer transition-colors group"
                            title="點擊編輯目標價"
                          >
                            ${item.target_price}
                            <svg className="w-3 h-3 text-gray-600 group-hover:text-gold-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>
                        )}
                      </td>

                      {/* Current lowest */}
                      <td className="table-cell text-right font-mono">
                        {snap?.lowest_price != null ? (
                          <span className={priceHit ? "price-hit font-semibold" : "price-miss"}>
                            ${snap.lowest_price}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      {/* Buyable count */}
                      <td className="table-cell text-right font-mono text-gray-400 text-xs">
                        {snap ? snap.buyable_count : "—"}
                      </td>

                      {/* Last checked */}
                      <td className="table-cell text-xs text-gray-500 font-mono">
                        {snap ? formatTime(snap.checked_at) : "尚未檢查"}
                      </td>

                      {/* Actions */}
                      <td className="table-cell">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleCheck(item.id)}
                            disabled={isChecking}
                            className="btn-ghost p-1.5"
                            title="立即查詢"
                          >
                            {isChecking ? (
                              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="btn-danger p-1.5"
                            title="刪除"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="px-4 py-3 border-t border-vault-700/30 flex items-center gap-4 text-xs text-gray-500">
            <span>
              共 <span className="font-mono text-gray-400">{items.length}</span> 筆
            </span>
            <span>
              啟用中 <span className="font-mono text-emerald-400">{items.filter((i) => i.is_active).length}</span>
            </span>
            <span>
              已到價{" "}
              <span className="font-mono text-gold-400">
                {items.filter(
                  (i) =>
                    i.latest_snapshot?.lowest_price != null &&
                    i.latest_snapshot.lowest_price <= i.target_price
                ).length}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
