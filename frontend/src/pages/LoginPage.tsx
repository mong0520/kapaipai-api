import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-vault-950 flex items-center justify-center">
      <div className="bg-vault-900 border border-vault-700/50 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/20 mb-4">
            <svg className="w-9 h-9 text-vault-950" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 2.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5zM6 10h8a4 4 0 01-8 0z" />
            </svg>
          </div>
          <h1 className="font-display font-bold text-2xl tracking-wide text-gray-100">
            卡拍拍
          </h1>
          <span className="text-xs font-display tracking-[0.2em] text-gold-500/70">
            非官方查價器
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Google Sign In */}
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={async (response) => {
              try {
                setError(null);
                await login(response.credential!);
                navigate("/");
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : "Login failed");
              }
            }}
            onError={() => setError("Google login failed")}
            theme="filled_black"
            size="large"
            width={300}
          />
        </div>
      </div>
    </div>
  );
}
