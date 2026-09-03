"use client";

import { useState, useEffect } from "react";
import {
  User,
  Camera,
  Lock,
  Check,
  AlertCircle,
  Save,
  Shield,
  Sparkles,
  Gamepad2,
} from "lucide-react";

interface ProfileClientProps {
  session: {
    userId: string;
    username: string;
    role: string;
    server: string;
    avatarUrl?: string | null;
  };
}

export function ProfileClient({ session }: ProfileClientProps) {
  const [avatarUrl, setAvatarUrl] = useState(session.avatarUrl || "");
  const [discordId, setDiscordId] = useState("");
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState("");

  // Senhas
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          if (data.user.avatarUrl) setAvatarUrl(data.user.avatarUrl);
          if (data.user.discordId) setDiscordId(data.user.discordId);
          if (data.user.email) setEmail(data.user.email);
          if (data.user.createdAt) setCreatedAt(data.user.createdAt);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToast(null);

    if (newPassword && newPassword !== confirmPassword) {
      setToast({ type: "error", msg: "A confirmação de senha não confere." });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarUrl,
          discordId,
          ...(newPassword ? { currentPassword, newPassword } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setToast({ type: "error", msg: data.error || "Erro ao salvar perfil." });
        return;
      }

      setToast({ type: "success", msg: "Perfil atualizado com sucesso!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Dispara evento para atualizar o avatar na sidebar imediatamente
      window.dispatchEvent(new CustomEvent("user-updated", { detail: { avatarUrl } }));
      setTimeout(() => setToast(null), 3500);
    } catch {
      setToast({ type: "error", msg: "Erro ao conectar com o servidor." });
    } finally {
      setSaving(false);
    }
  };

  const handleSetMinecraftSkin = () => {
    const skinUrl = `https://mc-heads.net/avatar/${session.username}/128`;
    setAvatarUrl(skinUrl);
  };

  const handleSetMascot = () => {
    setAvatarUrl("/mascot.png");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-[#2B2D31] pb-5">
        <h1 className="text-lg font-bold text-[#F2F3F5] tracking-tight flex items-center gap-2">
          <User className="w-5 h-5 text-[#5865F2]" />
          Personalização do Perfil
        </h1>
        <p className="text-xs text-[#949BA4] mt-0.5">
          Altere sua foto de perfil da staff, dados de contato e credenciais de acesso
        </p>
      </div>

      {toast && (
        <div
          className={`p-3 rounded-md text-xs flex items-center gap-2 ${
            toast.type === "success"
              ? "bg-[#23A55A]/20 border border-[#23A55A]/40 text-[#23A55A]"
              : "bg-[#DA373C]/20 border border-[#DA373C]/40 text-[#DA373C]"
          }`}
        >
          {toast.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Bloco 1: Foto de Perfil & Avatar */}
        <div className="bg-[#2B2D31] border border-[#202225] rounded-lg p-5 space-y-4">
          <div className="border-b border-[#202225] pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#F2F3F5] flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#5865F2]" />
              Foto de Perfil & Avatar
            </h2>
            <p className="text-[11px] text-[#949BA4]">
              Sua foto aparecerá na barra lateral, nos logs de moderação e na lista de plantão ao vivo
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Preview do Avatar */}
            <div className="relative w-20 h-20 rounded-full bg-[#1E1F22] border-2 border-[#383A40] overflow-hidden shrink-0 flex items-center justify-center shadow-lg">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={session.username}
                  className="w-full h-full object-cover"
                  onError={() => setAvatarUrl("")}
                />
              ) : (
                <span className="text-xl font-bold text-[#5865F2]">
                  {session.username.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            {/* Ações e Input de Imagem */}
            <div className="space-y-2.5 flex-1 w-full text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                  Link Direto da Imagem (URL)
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://i.imgur.com/... ou https://cdn.discordapp.com/..."
                  className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] placeholder-[#949BA4] focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              {/* Botões Rápidos */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSetMinecraftSkin}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[#313338] hover:bg-[#35373C] text-[#DBDEE1] hover:text-white rounded text-[11px] transition-colors border border-[#202225]"
                  title="Puxa a cabeça da sua skin do Minecraft automaticamente pelo seu nick"
                >
                  <Gamepad2 className="w-3 h-3 text-[#23A55A]" />
                  <span>Usar Skin do Minecraft</span>
                </button>

                <button
                  type="button"
                  onClick={handleSetMascot}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[#313338] hover:bg-[#35373C] text-[#DBDEE1] hover:text-white rounded text-[11px] transition-colors border border-[#202225]"
                >
                  <Sparkles className="w-3 h-3 text-[#F0B232]" />
                  <span>Usar Mascote Oficial</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    className="px-2.5 py-1 bg-[#313338] hover:bg-[#DA373C]/20 text-[#949BA4] hover:text-[#DA373C] rounded text-[11px] transition-colors"
                  >
                    Remover Foto
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 2: Informações da Conta */}
        <div className="bg-[#2B2D31] border border-[#202225] rounded-lg p-5 space-y-4">
          <div className="border-b border-[#202225] pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#F2F3F5] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#5865F2]" />
              Dados da Conta de Staff
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-[#949BA4] mb-1">
                Nome de Usuário (Nick)
              </label>
              <input
                type="text"
                disabled
                value={session.username}
                className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#949BA4] cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#949BA4] mb-1">
                Cargo & Servidor
              </label>
              <input
                type="text"
                disabled
                value={`${session.role} • ${session.server}`}
                className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#949BA4] cursor-not-allowed font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                E-mail Cadastrado
              </label>
              <input
                type="text"
                disabled
                value={email || "Carregando..."}
                className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#949BA4] cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                Discord Tag / ID (Opcional)
              </label>
              <input
                type="text"
                value={discordId}
                onChange={(e) => setDiscordId(e.target.value)}
                placeholder="ex: @seu_usuario ou seu_nick#0000"
                className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] placeholder-[#949BA4] focus:outline-none focus:border-[#5865F2]"
              />
            </div>
          </div>
        </div>

        {/* Bloco 3: Troca de Senha */}
        <div className="bg-[#2B2D31] border border-[#202225] rounded-lg p-5 space-y-4">
          <div className="border-b border-[#202225] pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#F2F3F5] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#F0B232]" />
              Segurança & Troca de Senha
            </h2>
            <p className="text-[11px] text-[#949BA4]">
              Preencha os campos abaixo apenas se desejar trocar a sua senha de acesso
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                Senha Atual
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] placeholder-[#949BA4] focus:outline-none focus:border-[#5865F2]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                Nova Senha
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] placeholder-[#949BA4] focus:outline-none focus:border-[#5865F2]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] placeholder-[#949BA4] focus:outline-none focus:border-[#5865F2]"
              />
            </div>
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-md text-xs shadow-md transition-all disabled:opacity-50"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Alterações do Perfil</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
