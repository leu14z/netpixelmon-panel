"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Pin,
  X,
  BookOpen,
  Eye,
  Copy,
  Check,
  Calendar,
  User,
} from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  authorName: string;
  authorId: string;
  pinned: boolean;
  createdAt: string;
}

export function NotesClient({ userRole, username }: { userRole: string; username: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [copied, setCopied] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<"REGULAMENTO" | "ATA_REUNIAO" | "AVISO" | "GERAL">("GERAL");
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  const isLeader = userRole === "OWNER" || userRole === "ADMIN";

  const loadNotes = async () => {
    try {
      const url = selectedCategory === "ALL" ? "/api/notes" : `/api/notes?category=${selectedCategory}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.notes) setNotes(data.notes);
    } catch {}
  };

  useEffect(() => {
    loadNotes();
  }, [selectedCategory]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, category, pinned }),
      });

      if (res.ok) {
        setTitle("");
        setContent("");
        setIsModalOpen(false);
        loadNotes();
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (id: string, noteTitle: string) => {
    if (!confirm(`Deseja excluir a anotação "${noteTitle}"?`)) return;
    await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
    if (viewingNote?.id === id) setViewingNote(null);
    loadNotes();
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "REGULAMENTO":
        return "Regulamento";
      case "ATA_REUNIAO":
        return "Ata de Reunião";
      case "AVISO":
        return "Aviso Importante";
      default:
        return "Anotação Geral";
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "REGULAMENTO":
        return "bg-[#DA373C]/20 text-[#DA373C] border border-[#DA373C]/30";
      case "ATA_REUNIAO":
        return "bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30";
      case "AVISO":
        return "bg-[#F0B232]/20 text-[#F0B232] border border-[#F0B232]/30";
      default:
        return "bg-[#4E5058]/30 text-[#DBDEE1]";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#2B2D31] pb-5">
        <div>
          <h1 className="text-lg font-bold text-[#F2F3F5] tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#5865F2]" />
            Anotações, Atas & Regulamentos
          </h1>
          <p className="text-xs text-[#949BA4] mt-0.5">
            Caderno oficial da equipe para substituir mensagens perdidas no Discord
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Anotação</span>
        </button>
      </div>

      {/* Categorias Filtro */}
      <div className="flex flex-wrap gap-1.5 border-b border-[#2B2D31] pb-3">
        {[
          { id: "ALL", label: "Todas" },
          { id: "REGULAMENTO", label: "Regulamentos" },
          { id: "ATA_REUNIAO", label: "Atas de Reunião" },
          { id: "AVISO", label: "Avisos" },
          { id: "GERAL", label: "Gerais" },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              selectedCategory === cat.id
                ? "bg-[#35373C] text-[#F2F3F5]"
                : "text-[#949BA4] hover:text-[#DBDEE1] hover:bg-[#2B2D31]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid de Notas com Altura Fixa Elegante */}
      {notes.length === 0 ? (
        <div className="p-12 text-center text-xs text-[#949BA4] bg-[#2B2D31] rounded-lg">
          Nenhuma anotação cadastrada nesta categoria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`p-4 rounded-lg bg-[#2B2D31] border flex flex-col justify-between h-[270px] transition-all hover:border-[#383A40] ${
                note.pinned ? "border-[#5865F2]/50 shadow-md" : "border-[#202225]"
              }`}
            >
              {/* Topo do Card */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getCategoryBadge(note.category)}`}>
                    {getCategoryLabel(note.category)}
                  </span>
                  <div className="flex items-center gap-1">
                    {note.pinned && <Pin className="w-3.5 h-3.5 text-[#5865F2]" />}
                    {(isLeader || note.authorName === username) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id, note.title);
                        }}
                        className="text-[#949BA4] hover:text-[#DA373C] p-1 rounded transition-colors"
                        title="Excluir Anotação"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="font-bold text-sm text-[#F2F3F5] truncate mb-1.5" title={note.title}>
                  {note.title}
                </h3>

                {/* Prévia do Conteúdo com Máscara de Fade */}
                <div className="relative max-h-[110px] overflow-hidden text-xs text-[#DBDEE1] leading-relaxed">
                  <p className="whitespace-pre-wrap line-clamp-4">{note.content}</p>
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#2B2D31] via-[#2B2D31]/80 to-transparent pointer-events-none" />
                </div>
              </div>

              {/* Ações do Card */}
              <div className="space-y-2.5 pt-2 border-t border-[#202225]">
                <button
                  onClick={() => setViewingNote(note)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#313338] hover:bg-[#35373C] text-[#DBDEE1] hover:text-white rounded text-xs font-semibold border border-[#202225] transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-[#5865F2]" />
                  <span>Abrir para Visualizar</span>
                </button>

                <div className="flex items-center justify-between text-[10px] text-[#949BA4]">
                  <span className="truncate">Por {note.authorName}</span>
                  <span>{new Date(note.createdAt).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE LEITURA COMPLETA (Focado e Centralizado) */}
      {viewingNote && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#2B2D31] border border-[#202225] w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header da Leitura */}
            <div className="p-4 border-b border-[#202225] bg-[#313338] flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${getCategoryBadge(viewingNote.category)}`}>
                  {getCategoryLabel(viewingNote.category)}
                </span>
                {viewingNote.pinned && (
                  <span className="flex items-center gap-1 text-[10px] text-[#5865F2] font-semibold bg-[#5865F2]/15 px-2 py-0.5 rounded border border-[#5865F2]/30">
                    <Pin className="w-3 h-3" /> Fixado
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(viewingNote.content);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#1E1F22] hover:bg-[#35373C] text-[#DBDEE1] hover:text-white rounded text-[11px] border border-[#202225] transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-[#23A55A]" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copiado!" : "Copiar Texto"}</span>
                </button>

                <button
                  onClick={() => setViewingNote(null)}
                  className="p-1 text-[#949BA4] hover:text-white rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Conteúdo com Scroll Interno Limpo */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <h2 className="text-base font-bold text-[#F2F3F5] mb-1 leading-snug">{viewingNote.title}</h2>
                <div className="flex items-center gap-2 text-[11px] text-[#949BA4]">
                  <span>Publicado por <b className="text-[#DBDEE1]">{viewingNote.authorName}</b></span>
                  <span>•</span>
                  <span>
                    {new Date(viewingNote.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Caixa com o Texto Completo */}
              <div className="p-4 bg-[#1E1F22] rounded-lg border border-[#202225] text-xs text-[#DBDEE1] leading-relaxed whitespace-pre-wrap font-sans selection:bg-[#5865F2]/30 max-h-[50vh] overflow-y-auto">
                {viewingNote.content}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[#202225] bg-[#313338] flex items-center justify-between">
              <div>
                {(isLeader || viewingNote.authorName === username) && (
                  <button
                    onClick={() => handleDeleteNote(viewingNote.id, viewingNote.title)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-[#DA373C] hover:bg-[#DA373C]/10 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Anotação</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setViewingNote(null)}
                className="px-4 py-1.5 bg-[#4E5058] hover:bg-[#6D6F78] text-white rounded-md text-xs font-semibold transition-colors"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVA NOTA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#313338] border border-[#202225] w-full max-w-lg rounded-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#202225] pb-3">
              <h3 className="font-bold text-sm text-[#F2F3F5] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#5865F2]" />
                Nova Anotação da Staff
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#949BA4] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                  Título da Anotação
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: Ata da Reunião de Domingo - Novo Boss"
                  className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2.5 text-[#F2F3F5] placeholder-[#949BA4] focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2.5 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                  >
                    <option value="REGULAMENTO">Regulamento</option>
                    <option value="ATA_REUNIAO">Ata de Reunião</option>
                    <option value="AVISO">Aviso Importante</option>
                    <option value="GERAL">Geral</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="pinned"
                    checked={pinned}
                    onChange={(e) => setPinned(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#1E1F22] border-[#202225] text-[#5865F2] focus:ring-0"
                  />
                  <label htmlFor="pinned" className="text-xs text-[#DBDEE1] select-none cursor-pointer flex items-center gap-1">
                    <Pin className="w-3 h-3 text-[#5865F2]" />
                    Fixar no topo
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                  Conteúdo da Anotação (Markdown ou Texto)
                </label>
                <textarea
                  required
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Descreva detalhadamente o regulamento, atas, comandos ou aviso..."
                  className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2.5 text-[#F2F3F5] placeholder-[#949BA4] focus:outline-none focus:border-[#5865F2] leading-relaxed resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#202225]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#2B2D31] hover:bg-[#35373C] text-[#DBDEE1] rounded-md text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-md text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Publicar Anotação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
