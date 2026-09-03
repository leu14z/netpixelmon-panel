"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Radio,
  Plus,
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

interface SupportRoom {
  id: string;
  code: string;
  playerNick: string;
  category: string;
  status: string;
  notes?: string;
  startedAt: string;
  closedAt?: string;
  staff: {
    username: string;
    role: string;
  };
}

export function SupportDashboardClient({ currentUser: _ }: { currentUser: any }) {
  const [rooms, setRooms] = useState<SupportRoom[]>([]);

  // Form
  const [playerNick, setPlayerNick] = useState("");
  const [category, setCategory] = useState<"LAUNCHER_ERROR" | "CRASH_LOGS" | "MODS_PIXELMON" | "OTHER">("LAUNCHER_ERROR");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<{ code: string; shareUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadRooms = async () => {
    try {
      const res = await fetch("/api/support/room");
      const data = await res.json();
      if (data.rooms) setRooms(data.rooms);
    } catch {}
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreatedRoom(null);

    try {
      const res = await fetch("/api/support/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerNick, category, notes }),
      });

      const data = await res.json();
      if (res.ok) {
        setCreatedRoom({
          code: data.room.code,
          shareUrl: `${window.location.origin}/suporte/sala/${data.room.code}`,
        });
        setPlayerNick("");
        setNotes("");
        loadRooms();
      }
    } catch {
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "LAUNCHER_ERROR":
        return "Erro no Launcher";
      case "CRASH_LOGS":
        return "Crash Logs / Java";
      case "MODS_PIXELMON":
        return "Mods / Pixelmon";
      default:
        return "Outros Problemas";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#2B2D31] pb-5">
        <div>
          <h1 className="text-lg font-bold text-[#F2F3F5] tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#5865F2]" />
            Suporte ao Vivo com Transmissão de Tela (WebRTC)
          </h1>
          <p className="text-xs text-[#949BA4] mt-0.5">
            Salas diretas pelo navegador para inspecionar Minecraft, Launcher e logs de erro dos jogadores
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Criação */}
        <div className="bg-[#2B2D31] border border-[#202225] rounded-lg p-5 space-y-4">
          <div className="border-b border-[#202225] pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#F2F3F5] flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#5865F2]" />
              Gerar Nova Sala de Suporte
            </h2>
            <p className="text-[11px] text-[#949BA4] mt-0.5">
              Envie o link para o jogador no Discord ou no chat do Minecraft
            </p>
          </div>

          {createdRoom && (
            <div className="p-3 bg-[#313338] border border-[#5865F2]/40 rounded-md space-y-2">
              <div className="flex items-center justify-between text-xs text-[#5865F2] font-semibold">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-[#23A55A]" />
                  Sala: {createdRoom.code}
                </span>
                <Link
                  href={`/suporte/sala/${createdRoom.code}`}
                  className="text-[11px] text-[#5865F2] hover:underline flex items-center gap-1"
                >
                  Entrar na Sala <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={createdRoom.shareUrl}
                  className="w-full bg-[#1E1F22] border border-[#202225] rounded py-1.5 px-2 text-[11px] font-mono text-[#DBDEE1]"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdRoom.shareUrl)}
                  className="px-2.5 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded text-xs font-medium transition-colors flex items-center gap-1 shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleCreateRoom} className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                Nick do Jogador no Minecraft
              </label>
              <input
                type="text"
                required
                value={playerNick}
                onChange={(e) => setPlayerNick(e.target.value)}
                placeholder="ex: Jogador123"
                className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2.5 text-[#F2F3F5] placeholder-[#949BA4] focus:outline-none focus:border-[#5865F2]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                Categoria do Problema
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2.5 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
              >
                <option value="LAUNCHER_ERROR">Erro no Launcher / Inicialização</option>
                <option value="CRASH_LOGS">Crash Logs / Alocação de Memória</option>
                <option value="MODS_PIXELMON">Modpack / Texturas Pixelmon</option>
                <option value="OTHER">Outros Problemas Técnicos</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                Anotações Internas (Opcional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações que apenas a staff pode ver..."
                className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] placeholder-[#949BA4] focus:outline-none focus:border-[#5865F2]"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-md text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {creating ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5" />
                  <span>Criar Sala de Atendimento</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Lista de Atendimentos */}
        <div className="lg:col-span-2 bg-[#2B2D31] border border-[#202225] rounded-lg p-5 space-y-4">
          <div className="border-b border-[#202225] pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#F2F3F5]">
                Atendimentos & Salas Recentes
              </h2>
              <p className="text-[11px] text-[#949BA4]">Histórico de chamadas com transmissão de tela</p>
            </div>
            <span className="text-[11px] font-mono text-[#949BA4]">
              Total: {rooms.length}
            </span>
          </div>

          {rooms.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#949BA4]">
              Nenhuma sala de suporte aberta no momento.
            </div>
          ) : (
            <div className="divide-y divide-[#202225]">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="py-3 px-2 flex items-center justify-between hover:bg-[#313338] rounded-md transition-colors text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#5865F2] font-bold">{room.code}</span>
                      <span className="font-medium text-[#F2F3F5]">{room.playerNick}</span>
                      <span className="px-1.5 py-0.2 bg-[#1E1F22] text-[#949BA4] rounded text-[10px]">
                        {getCategoryLabel(room.category)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#949BA4]">
                      <span>Staff: {room.staff.username}</span>
                      <span>• Aberto em: {new Date(room.startedAt).toLocaleTimeString("pt-BR")}</span>
                      {room.notes && <span>• Obs: {room.notes}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {room.status === "ACTIVE" ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#23A55A]/20 text-[#23A55A] text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#23A55A] animate-pulse" />
                        AO VIVO
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-[#1E1F22] text-[#949BA4] text-[10px]">
                        ENCERRADO
                      </span>
                    )}

                    <Link
                      href={`/suporte/sala/${room.code}`}
                      className="px-3 py-1 bg-[#4E5058] hover:bg-[#6D6F78] text-[#F2F3F5] rounded text-xs transition-colors flex items-center gap-1"
                    >
                      <span>{room.status === "ACTIVE" ? "Abrir" : "Ver"}</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
