import { useState, useEffect } from "react";
import type { CardVariant } from "../types";

interface Props {
  cards: CardVariant[];
  open: boolean;
  onClose: () => void;
  onSubmit: (
    items: Array<CardVariant & { target_price: number; target_price_min: number }>,
  ) => void;
  loading?: boolean;
}

export default function PriceAlertModal({
  cards,
  open,
  onClose,
  onSubmit,
  loading,
}: Props) {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [minPrices, setMinPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {};
      const initialMin: Record<string, string> = {};
      for (const c of cards) {
        const key = `${c.card_key}|${c.rare}|${c.pack_id}`;
        initial[key] = c.lowest_price ? String(c.lowest_price) : "";
        initialMin[key] = "";
      }
      setPrices(initial);
      setMinPrices(initialMin);
    }
  }, [open, cards]);

  if (!open) return null;

  function handleSubmit() {
    const items = cards
      .map((c) => {
        const key = `${c.card_key}|${c.rare}|${c.pack_id}`;
        const price = parseInt(prices[key] || "0", 10);
        const minPrice = parseInt(minPrices[key] || "0", 10);
        return {
          ...c,
          target_price: price,
          target_price_min: isNaN(minPrice) || minPrice < 0 ? 0 : minPrice,
        };
      })
      .filter((item) => item.target_price > 0);

    if (items.length === 0) return;
    onSubmit(items);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative card-frame w-full max-w-lg max-w-[calc(100vw-2rem)] max-h-[80vh] flex flex-col animate-slide-up shadow-xl">
        <div className="gold-border-top" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-display font-bold text-lg tracking-wide text-gray-900">
              設定到價通知
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              已選擇 {cards.length} 張卡牌
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <svg
              className="w-5 h-5"
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
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {cards.map((card) => {
            const key = `${card.card_key}|${card.rare}|${card.pack_id}`;
            return (
              <div
                key={key}
                className="flex flex-col gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {card.card_name}
                    </span>
                    <span className="badge badge-rare">{card.rare}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {card.pack_name} ({card.pack_id}) #{card.pack_card_id}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    目前最低{" "}
                    <span className="text-amber-600 font-mono">
                      {card.lowest_price != null
                        ? `$${card.lowest_price}`
                        : "—"}
                    </span>
                    {" / "}均價{" "}
                    <span className="font-mono">
                      {card.avg_price != null ? `$${card.avg_price}` : "—"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-gray-400 w-8">最低</span>
                    <span className="text-xs text-gray-400">$</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={minPrices[key] || ""}
                      onChange={(e) =>
                        setMinPrices((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      className="input-dark w-20 !py-1.5 text-sm text-right font-mono"
                    />
                  </div>
                  <span className="text-gray-300">~</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-gray-400 w-8">最高</span>
                    <span className="text-xs text-gray-400">$</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="目標價"
                      value={prices[key] || ""}
                      onChange={(e) =>
                        setPrices((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      className="input-dark w-20 !py-1.5 text-sm text-right font-mono"
                    />
                  </div>
                </div>
              </div>
            );
          })}
          <p className="text-[11px] text-gray-400 leading-relaxed">
            * 最低價可過濾疑似假低價的賣家，設 0 或留空表示不設下限
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="btn-ghost">
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="btn-gold"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
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
                處理中…
              </span>
            ) : (
              "加入監控"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
