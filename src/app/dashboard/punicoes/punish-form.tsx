"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

export function PunishFormClient({ userRole }: { userRole: string }) {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [playerUuid, setPlayerUuid] = useState("");
  const [type, setType] = useState<"BAN" | "MUTE" | "KICK" | "WARN">("BAN");
  const [reason, setReason] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isAllowed = ["OWNER", "ADMIN", "MODERATOR"].includes(userRole);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/staff/punish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName,
          playerUuid: playerUuid.trim() || `uuid-${playerName.toLowerCase()}`,
          type,
          reason,
          proofUrl: proofUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao registrar punição.");
        return;
      }

      setSuccess(`Punição aplicada com sucesso ao jogador ${playerName}!`);
      setPlayerName("");
      setPlayerUuid("");
      setReason("");
      setProofUrl("");
      router.refresh();
    } catch {
      setError("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  if (!isAllowed) {
    return (
      <div className="p-3 bg-[#F0B232]/10 border border-[#F0B232]/30 rounded text-[#F0B232] text-xs">
        Seu cargo ({userRole}) não possui permissão para aplicar punições.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
      {error && (
        <div className="p-2.5 bg-[#DA373C]/20 border border-[#DA373C]/40 rounded text-[#DA373C] text-xs">
          {error}
        </div>
      )}

      {success && (
        <div className="p-2.5 bg-[#23A55A]/20 border border-[#23A55A]/40 rounded text-[#23A55A] text-xs">
          {success}
        </div>
      )}

      <div>
        <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
          Nick do Jogador
        </label>
        <input
          type="text"
          required
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="ex: Jogador123"
          className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2.5 text-[#F2F3F5] placeholder-[#949BA4] focus:outline-none focus:border-[#DA373C]"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
          UUID do Jogador (Opcional)
        </label>
        <input
          type="text"
          value={playerUuid}
          onChange={(e) => setPlayerUuid(e.target.value)}
          placeholder="ex: 86666459-462d-4e9e-8c85-01f780381617"
          className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2.5 text-[#F2F3F5] placeholder-[#949BA4] focus:outline-none focus:border-[#DA373C]"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
          Tipo de Infração
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2.5 text-[#F2F3F5] focus:outline-none focus:border-[#DA373C]"
        >
          <option value="BAN">BANIMENTO</option>
          <option value="MUTE">SILENCIAMENTO</option>
          <option value="KICK">EXPULSÃO</option>
          <option value="WARN">ADVERTÊNCIA</option>
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
          Motivo da Infração
        </label>
        <textarea
          rows={3}
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Descreva a regra violada..."
          className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2.5 text-[#F2F3F5] placeholder-[#949BA4] focus:outline-none focus:border-[#DA373C]"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
          Link da Prova (Vídeo / Imagem)
        </label>
        <input
          type="url"
          value={proofUrl}
          onChange={(e) => setProofUrl(e.target.value)}
          placeholder="https://..."
          className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2.5 text-[#F2F3F5] placeholder-[#949BA4] focus:outline-none focus:border-[#DA373C]"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-[#DA373C] hover:bg-[#A12828] text-white font-semibold rounded-md text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Aplicar Punição</span>
          </>
        )}
      </button>
    </form>
  );
}
