import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { updateLineBinding } from "../api/client";

export default function LineBindingPage() {
  const { user, refreshUser } = useAuth();
  const [lineId, setLineId] = useState(user?.line_user_id || "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    setToast("");
    try {
      await updateLineBinding(lineId.trim());
      await refreshUser();
      setToast(lineId.trim() ? "LINE ID 綁定成功" : "LINE ID 已解除綁定");
    } catch (e) {
      setError(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl tracking-wide text-gray-100">
          LINE 綁定
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          綁定你的 LINE User ID，到價時會收到 LINE 推播通知
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

      <div className="card-frame p-6 space-y-5 animate-fade-in">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            LINE User ID
          </label>
          <input
            type="text"
            value={lineId}
            onChange={(e) => setLineId(e.target.value)}
            placeholder="U1234567890abcdef..."
            className="input-dark w-full font-mono"
          />
          <p className="text-xs text-gray-600">
            格式為 U 開頭的 33 字元字串，可從 LINE Bot 取得
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            儲存
          </button>
          {user?.line_user_id && (
            <button
              onClick={() => { setLineId(""); }}
              className="btn-ghost text-sm"
            >
              清除綁定
            </button>
          )}
        </div>

        {/* Current status */}
        <div className="pt-4 border-t border-vault-700/30">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">目前狀態：</span>
            {user?.line_user_id ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                已綁定
                <span className="font-mono text-xs text-gray-500 ml-1">
                  {user.line_user_id.slice(0, 8)}...
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-gray-500">
                <div className="w-2 h-2 rounded-full bg-gray-600" />
                未綁定
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
