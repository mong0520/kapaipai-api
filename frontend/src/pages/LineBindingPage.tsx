import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { generateLineBindingCode, updateLineBinding } from "../api/client";

const CODE_TTL_SECONDS = 300; // 5 minutes

export default function LineBindingPage() {
  const { user, refreshUser } = useAuth();
  const [code, setCode] = useState("");
  const [botUrl, setBotUrl] = useState("");
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
      if (res.bot_url) setBotUrl(res.bot_url);
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

              <div className="p-4 rounded-lg bg-vault-800/50 border border-vault-700/30 space-y-3">
                <p className="text-sm text-gray-300 font-medium">操作說明</p>
                <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
                  <li>掃描下方 QR Code 加入 Bot 為好友</li>
                  <li>開啟與 Bot 的聊天</li>
                  <li>傳送上方 6 位數驗證碼</li>
                </ol>
                {botUrl && (
                  <div className="flex flex-col items-center gap-2 pt-2">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(botUrl)}`}
                      alt="LINE Bot QR Code"
                      className="w-36 h-36 rounded-lg bg-white p-1"
                    />
                    <a
                      href={botUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#06C755] text-white text-xs font-medium hover:bg-[#05b54d] transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                      </svg>
                      或點此加為好友
                    </a>
                  </div>
                )}
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
