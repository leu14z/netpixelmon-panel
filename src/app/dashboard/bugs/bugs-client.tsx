"use client";

import { useState, useEffect } from "react";
import { Bug, Plus, ExternalLink, Trash2, X } from "lucide-react";

interface BugItem {
  id: string;
  title: string;
  description: string;
  category: string;
  server: string;
  priority: string;
  status: string;
  reporterNick?: string;
  proofUrl?: string;
  createdAt: string;
}

export function BugsClient({ userRole }: { userRole: string }) {
  const [bugs, setBugs] = useState<BugItem[]>([]);
  const [serverFilter, setServerFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"LAUNCHER" | "BATALHA" | "DUPE_ECONOMIA" | "CRASH" | "OUTRO">("OUTRO");
  const [server, setServer] = useState<"CYAN" | "ORANGE" | "GLOBAL">("GLOBAL");
  const [priority, setPriority] = useState<"BAIXA" | "MEDIA" | "CRITICA">("MEDIA");
  const [reporterNick, setReporterNick] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const isLeader = userRole === "OWNER" || userRole === "ADMIN";

  const loadBugs = async () => {
    try {
      const params = new URLSearchParams();
      if (serverFilter !== "ALL") params.append("server", serverFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetch(`/api/bugs?${params.toString()}`);
      const data = await res.json();
      if (data.bugs) setBugs(data.bugs);
    } catch {}
  };

  useEffect(() => {
    loadBugs();
  }, [serverFilter, statusFilter]);

  const handleCreateBug = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/bugs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          server,
          priority,
          reporterNick: reporterNick || undefined,
          proofUrl: proofUrl || undefined,
        }),
      });

      if (res.ok) {
        setTitle("");
        setDescription("");
        setReporterNick("");
        setProofUrl("");
        setIsModalOpen(false);
        loadBugs();
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    await fetch("/api/bugs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    loadBugs();
  };

  const handleDeleteBug = async (id: string) => {
    if (!confirm("Deseja realmente excluir este relatório de bug?")) return;
    await fetch(`/api/bugs?id=${id}`, { method: "DELETE" });
    loadBugs();
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "CRITICA":
        return "bg-[#DA373C]/20 text-[#DA373C] border border-[#DA373C]/40 font-bold";
      case "MEDIA":
        return "bg-[#F0B232]/20 text-[#F0B232] border border-[#F0B232]/40";
      default:
        return "bg-[#4E5058]/30 text-[#DBDEE1]";
    }
  };

  const getCategoryLabel = (c: string) => {
    switch (c) {
      case "LAUNCHER":
        return "Launcher / Java";
      case "BATALHA":
        return "Batalhas Pixelmon";
      case "DUPE_ECONOMIA":
        return "Economia / Duplicação";
      case "CRASH":
        return "Crash de Servidor";
      default:
        return "Outros";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#2B2D31] pb-5">
        <div>
          <h1 className="text-lg font-bold text-[#F2F3F5] tracking-tight flex items-center gap-2">
            <Bug className="w-5 h-5 text-[#DA373C]" />
            Central de Bugs & Relatórios de Erros
          </h1>
          <p className="text-xs text-[#949BA4] mt-0.5">
            Triagem organizada de falhas técnicas reportadas no Cyan e no Orange
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Reportar Novo Bug</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2B2D31] pb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[#949BA4] font-medium">Servidor:</span>
          {["ALL", "CYAN", "ORANGE"].map((srv) => (
            <button
              key={srv}
              onClick={() => setServerFilter(srv)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                serverFilter === srv ? "bg-[#35373C] text-[#F2F3F5]" : "text-[#949BA4] hover:text-[#DBDEE1]"
              }`}
            >
              {srv === "ALL" ? "Todos" : srv}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#949BA4] font-medium">Status:</span>
          {["ALL", "RECEBIDO", "INVESTIGANDO", "CORRIGIDO", "DESCARTADO"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === st ? "bg-[#35373C] text-[#F2F3F5]" : "text-[#949BA4] hover:text-[#DBDEE1]"
              }`}
            >
              {st === "ALL" ? "Todos" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Bugs */}
      <div className="bg-[#2B2D31] border border-[#202225] rounded-lg overflow-hidden shadow-sm">
        {bugs.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#949BA4]">
            Nenhum relatório de bug encontrado para estes filtros.
          </div>
        ) : (
          <div className="divide-y divide-[#202225]">
            {bugs.map((b) => (
              <div
                key={b.id}
                className="p-4 hover:bg-[#313338] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${getPriorityBadge(b.priority)}`}>
                      {b.priority}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1E1F22] text-[#DBDEE1]">
                      {b.server}
                    </span>
                    <span className="text-[10px] text-[#949BA4]">
                      {getCategoryLabel(b.category)}
                    </span>
                    {b.reporterNick && (
                      <span className="text-[10px] text-[#949BA4]">
                        • Jogador: {b.reporterNick}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-[#F2F3F5]">{b.title}</h3>
                  <p className="text-xs text-[#DBDEE1] leading-relaxed whitespace-pre-wrap">
                    {b.description}
                  </p>

                  <div className="flex items-center gap-3 text-[10px] text-[#949BA4] font-mono">
                    <span>Registrado em {new Date(b.createdAt).toLocaleDateString("pt-BR")}</span>
                    {b.proofUrl && (
                      <a
                        href={b.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#5865F2] hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Ver Print/Prova
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <select
                    value={b.status}
                    onChange={(e) => handleUpdateStatus(b.id, e.target.value)}
                    className="bg-[#1E1F22] border border-[#383A40] text-xs text-[#F2F3F5] rounded px-2.5 py-1.5 focus:outline-none focus:border-[#5865F2]"
                  >
                    <option value="RECEBIDO">Recebido</option>
                    <option value="INVESTIGANDO">Em Investigação</option>
                    <option value="CORRIGIDO">Corrigido</option>
                    <option value="DESCARTADO">Descartado</option>
                  </select>

                  {isLeader && (
                    <button
                      onClick={() => handleDeleteBug(b.id)}
                      className="p-1.5 text-[#949BA4] hover:text-[#DA373C] hover:bg-[#DA373C]/10 rounded"
                      title="Excluir Registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: NOVO BUG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#313338] border border-[#202225] w-full max-w-lg rounded-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#202225] pb-3">
              <h3 className="font-bold text-sm text-[#F2F3F5] flex items-center gap-2">
                <Bug className="w-4 h-4 text-[#DA373C]" />
                Registrar Novo Relatório de Bug
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#949BA4] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBug} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                  Título do Problema
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: Batalha travando ao mega evoluir Rayquaza no Cyan"
                  className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2.5 text-[#F2F3F5] placeholder-[#949BA4] focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                  >
                    <option value="LAUNCHER">Launcher / Java</option>
                    <option value="BATALHA">Batalha Pixelmon</option>
                    <option value="DUPE_ECONOMIA">Dupe / Economia</option>
                    <option value="CRASH">Crash</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                    Servidor Afetado
                  </label>
                  <select
                    value={server}
                    onChange={(e) => setServer(e.target.value as any)}
                    className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                  >
                    <option value="GLOBAL">Ambos / Global</option>
                    <option value="CYAN">Cyan</option>
                    <option value="ORANGE">Orange</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                    Urgência
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="CRITICA">Crítica (Crash/Dupe)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                  Descrição dos Passos para Reproduzir
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Como o bug acontece? Quais comandos ou itens provocam o erro?"
                  className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2.5 text-[#F2F3F5] placeholder-[#949BA4] focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                    Nick do Jogador que Reportou (Opcional)
                  </label>
                  <input
                    type="text"
                    value={reporterNick}
                    onChange={(e) => setReporterNick(e.target.value)}
                    placeholder="ex: Jogador123"
                    className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                    Link de Imagem / Vídeo da Prova (Opcional)
                  </label>
                  <input
                    type="url"
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#202225]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 text-[#DBDEE1] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-md shadow-sm"
                >
                  Registrar Bug
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
