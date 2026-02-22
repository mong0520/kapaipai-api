import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { generateLineBindingCode, updateLineBinding } from "../api/client";

const CODE_TTL_SECONDS = 300; // 5 minutes

export default function LineBindingPage() {
  const { user, refreshUser } = useAuth();
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [unbinding, setUnbinding] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // Poll for binding status when code is active
  useEffect(() => {
    if (!code || countdown <= 0) return;

    pollRef.current = setInterval(async () => {
      await refreshUser();
    }, 2000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [code, countdown, refreshUser]);

  // Detect binding success during polling
  useEffect(() => {
    if (code && user?.line_user_id) {
      setCode("");
      setCountdown(0);
      stopPolling();
      setToast("LINE 綁定成功！");
    }
  }, [user?.line_user_id, code, stopPolling]);

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    setToast("");
    try {
      const res = await generateLineBindingCode();
      setCode(res.code);
      setCountdown(CODE_TTL_SECONDS);

      // Start countdown timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setCode("");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "產生驗證碼失敗");
    } finally {
      setGenerating(false);
    }
  }

  async function handleUnbind() {
    setUnbinding(true);
    setError("");
    setToast("");
    try {
      await updateLineBinding("");
      await refreshUser();
      setToast("LINE 綁定已解除");
    } catch (e) {
      setError(e instanceof Error ? e.message : "解除綁定失敗");
    } finally {
      setUnbinding(false);
    }
  }

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const isBound = !!user?.line_user_id;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl tracking-wide text-gray-100">
          LINE 綁定
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          綁定 LINE 帳號後，到價通知會直接推送到你的 LINE
        </p>
      </div>

      {toast && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {toast}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      {isBound ? (
        /* ===== Bound State ===== */
        <div className="card-frame p-6 space-y-5 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-200 font-medium">LINE 已綁定</p>
              <p className="text-xs text-gray-500 font-mono">{user!.line_user_id!.slice(0, 10)}...</p>
            </div>
          </div>
          <p className="text-sm text-gray-400">
            到價通知會自動發送到你的 LINE，你可以隨時解除綁定。
          </p>
          <button
            onClick={handleUnbind}
            disabled={unbinding}
            className="btn-ghost text-sm text-red-400 hover:text-red-300"
          >
            {unbinding ? "解除中..." : "解除綁定"}
          </button>
        </div>
      ) : (
        /* ===== Unbound State ===== */
        <div className="card-frame p-6 space-y-6 animate-fade-in">
          {!code ? (
            /* Step 1: Generate code */
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-gray-200 font-medium">綁定步驟</h3>
                <ol className="text-sm text-gray-400 space-y-1.5 list-decimal list-inside">
                  <li>點擊下方按鈕產生驗證碼</li>
                  <li>加入我們的 LINE Bot 為好友</li>
                  <li>在 LINE 聊天中傳送驗證碼給 Bot</li>
                  <li>綁定自動完成！</li>
                </ol>
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="btn-primary flex items-center gap-2"
              >
                {generating ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                )}
                產生驗證碼
              </button>
            </div>
          ) : (
            /* Step 2: Show code + instructions */
            <div className="space-y-5">
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-400">請在 LINE 中傳送以下驗證碼給 Bot</p>
                <div className="inline-block px-8 py-4 rounded-xl bg-vault-800 border border-gold-500/30">
                  <span className="font-mono text-4xl font-bold tracking-[0.3em] text-gold-400">
                    {code}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`font-mono ${countdown <= 60 ? "text-red-400" : "text-gray-400"}`}>
                    {formatCountdown(countdown)}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-vault-800/50 border border-vault-700/30 space-y-2">
                <p className="text-sm text-gray-300 font-medium">操作說明</p>
                <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                  <li>在 LINE 中加入 Bot 為好友</li>
                  <li>開啟與 Bot 的聊天</li>
                  <li>傳送上方 6 位數驗證碼</li>
                </ol>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={handleGenerate} className="btn-ghost text-sm">
                  重新產生
                </button>
                <span className="text-xs text-gray-600">等待綁定中...</span>
                <svg className="animate-spin w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
