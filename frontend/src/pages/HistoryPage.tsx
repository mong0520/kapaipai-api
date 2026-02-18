import { useState, useEffect } from "react";
import type { NotificationRecord } from "../types";
import { getNotifications } from "../api/client";

export default function HistoryPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await getNotifications(100);
        setNotifications(res.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "載入失敗");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString("zh-TW", {
      year: "numeric",
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl tracking-wide text-gray-100">
          通知紀錄
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          歷史到價通知列表
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="card-frame p-12 text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-vault-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <p className="text-gray-500">目前沒有通知紀錄</p>
          <p className="text-xs text-gray-600 mt-1">當你監控的卡牌到價時，通知會顯示在這裡</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif, i) => (
            <div
              key={notif.id}
              className="card-frame p-4 animate-slide-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    notif.status === "sent"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {notif.status === "sent" ? (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-200">
                      {notif.card_name || "未知卡牌"}
                    </span>
                    {notif.rare && (
                      <span className="badge badge-rare text-[10px]">{notif.rare}</span>
                    )}
                    <span
                      className={`badge text-[10px] ${
                        notif.status === "sent"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}
                    >
                      {notif.status === "sent" ? "已發送" : "發送失敗"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mt-1.5 text-xs">
                    <span className="text-gray-500">
                      觸發價{" "}
                      <span className="font-mono text-emerald-400">${notif.triggered_price}</span>
                    </span>
                    <span className="text-gray-600">/</span>
                    <span className="text-gray-500">
                      目標價{" "}
                      <span className="font-mono text-gold-400">${notif.target_price}</span>
                    </span>
                  </div>
                </div>

                {/* Time */}
                <span className="text-xs text-gray-600 font-mono shrink-0">
                  {formatTime(notif.sent_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
