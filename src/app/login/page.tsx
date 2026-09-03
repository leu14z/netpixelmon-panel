"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, User, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          turnstileToken: "XXXX.DUMMY.TOKEN.XXXX",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Credenciais inválidas. Verifique seu login.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Não foi possível conectar ao servidor. Verifique sua conexão.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1E1F22] text-[#DBDEE1] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm">
        {/* Top Header com Mascote Oficial */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#2B2D31] border border-[#383A40] p-2 mx-auto mb-3 shadow-md flex items-center justify-center">
            <Image
              src="/mascot.png"
              alt="NetPixelmon"
              width={52}
              height={52}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#F2F3F5]">
            NetPixelmon Staff
          </h1>
          <p className="text-xs text-[#949BA4] mt-0.5">
            Acesso interno de moderação e administração
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-[#2B2D31] border border-[#202225] rounded-lg p-6 shadow-xl space-y-4">
          {error && (
            <div className="p-3 bg-[#DA373C]/15 border border-[#DA373C]/40 rounded-md text-[#DA373C] text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#949BA4] mb-1.5">
                Usuário / Login
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#949BA4] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Seu usuário da staff"
                  autoComplete="username"
                  className="w-full bg-[#1E1F22] border border-[#202225] rounded-md py-2.5 pl-9 pr-3 text-[#F2F3F5] placeholder-[#949BA4] focus:outline-none focus:border-[#5865F2]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#949BA4] mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#949BA4] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full bg-[#1E1F22] border border-[#202225] rounded-md py-2.5 pl-9 pr-3 text-[#F2F3F5] placeholder-[#949BA4] focus:outline-none focus:border-[#5865F2]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold py-2.5 px-4 rounded-md text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-[#202225] flex items-center justify-between text-[10px] text-[#949BA4]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#23A55A]" />
              Sessão Criptografada
            </span>
            <span>Ambiente Privado</span>
          </div>
        </div>

        <p className="text-[11px] text-center text-[#949BA4] mt-4">
          Contas de staff são criadas exclusivamente pela liderança.
        </p>
      </div>
    </div>
  );
}
