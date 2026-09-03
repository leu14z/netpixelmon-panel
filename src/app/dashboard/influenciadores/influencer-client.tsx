"use client";

import { useState, useEffect } from "react";
import {
  Video,
  UserCheck,
  Plus,
  ExternalLink,
  Tag,
  Copy,
  Check,
  Trash2,
  Lightbulb,
  X,
} from "lucide-react";

interface Influencer {
  id: string;
  name: string;
  channelUrl: string;
  platform: string;
  couponCode: string;
  subscribersCount: number;
  status: string;
  monthlyReward?: string;
  notes?: string;
  createdAt: string;
}

interface ContentIdea {
  id: string;
  title: string;
  description: string;
  targetServer: string;
  status: string;
  createdAt: string;
}

export function InfluencersClient({ userRole }: { userRole: string }) {
  const [activeTab, setActiveTab] = useState<"creators" | "ideas">("creators");
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);

  // Modais
  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState(false);
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  // Form Criador
  const [name, setName] = useState("");
  const [channelUrl, setChannelUrl] = useState("");
  const [platform, setPlatform] = useState<"YOUTUBE" | "TWITCH" | "TIKTOK" | "KICK">("YOUTUBE");
  const [couponCode, setCouponCode] = useState("");
  const [subscribersCount, setSubscribersCount] = useState(0);
  const [status, setStatus] = useState<"ACTIVE" | "IN_TEST" | "PAUSED">("ACTIVE");
  const [monthlyReward, setMonthlyReward] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Ideia
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDesc, setIdeaDesc] = useState("");
  const [ideaServer, setIdeaServer] = useState<"GLOBAL" | "CYAN" | "ORANGE">("GLOBAL");

  const isLeader = userRole === "OWNER" || userRole === "ADMIN";

  const loadData = async () => {
    try {
      const res = await fetch("/api/influencers");
      const data = await res.json();
      if (data.influencers) setInfluencers(data.influencers);
      if (data.ideas) setIdeas(data.ideas);
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCreator = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      const res = await fetch("/api/influencers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "INFLUENCER",
          data: {
            name,
            channelUrl,
            platform,
            couponCode: couponCode.trim().toUpperCase(),
            subscribersCount: Number(subscribersCount),
            status,
            monthlyReward: monthlyReward || undefined,
            notes: notes || undefined,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Erro ao cadastrar influenciador.");
        return;
      }

      setName("");
      setChannelUrl("");
      setCouponCode("");
      setMonthlyReward("");
      setNotes("");
      setIsCreatorModalOpen(false);
      loadData();
    } catch {
      setErrorMsg("Erro de conexão com o servidor.");
    }
  };

  const handleCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/influencers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "IDEA",
          data: {
            title: ideaTitle,
            description: ideaDesc,
            targetServer: ideaServer,
            status: "SUGGESTED",
          },
        }),
      });

      if (res.ok) {
        setIdeaTitle("");
        setIdeaDesc("");
        setIsIdeaModalOpen(false);
        loadData();
      }
    } catch {}
  };

  const handleDeleteCreator = async (id: string, creatorName: string) => {
    if (!confirm(`Deseja realmente remover a parceria com ${creatorName}?`)) return;
    await fetch(`/api/influencers?id=${id}&type=INFLUENCER`, { method: "DELETE" });
    loadData();
  };

  const handleDeleteIdea = async (id: string) => {
    await fetch(`/api/influencers?id=${id}&type=IDEA`, { method: "DELETE" });
    loadData();
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2000);
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "ACTIVE":
        return "bg-[#23A55A]/20 text-[#23A55A] font-bold";
      case "IN_TEST":
        return "bg-[#F0B232]/20 text-[#F0B232] font-bold";
      default:
        return "bg-[#4E5058]/30 text-[#949BA4]";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#2B2D31] pb-5">
        <div>
          <h1 className="text-lg font-bold text-[#F2F3F5] tracking-tight flex items-center gap-2">
            <Video className="w-5 h-5 text-[#5865F2]" />
            Parcerias & Criadores de Conteúdo
          </h1>
          <p className="text-xs text-[#949BA4] mt-0.5">
            Gestão de influenciadores, cupons de desconto da loja CentralCart e pautas de gravações
          </p>
        </div>

        {isLeader && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setErrorMsg(null);
                setIsCreatorModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Influenciador</span>
            </button>
            <button
              onClick={() => setIsIdeaModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4E5058] hover:bg-[#6D6F78] text-[#F2F3F5] text-xs font-medium rounded-md transition-colors"
            >
              <Lightbulb className="w-3.5 h-3.5 text-[#F0B232]" />
              <span>Sugerir Pauta</span>
            </button>
          </div>
        )}
      </div>

      {/* Sub-Abas */}
      <div className="flex items-center gap-1.5 border-b border-[#2B2D31] pb-3">
        <button
          onClick={() => setActiveTab("creators")}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === "creators"
              ? "bg-[#35373C] text-[#F2F3F5]"
              : "text-[#949BA4] hover:text-[#DBDEE1]"
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Criadores Ativos ({influencers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("ideas")}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === "ideas"
              ? "bg-[#35373C] text-[#F2F3F5]"
              : "text-[#949BA4] hover:text-[#DBDEE1]"
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Pautas de Vídeos ({ideas.length})</span>
        </button>
      </div>

      {/* ABA: CRIADORES */}
      {activeTab === "creators" && (
        <div className="bg-[#2B2D31] border border-[#202225] rounded-lg overflow-hidden shadow-sm">
          {influencers.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#949BA4]">
              Nenhum criador de conteúdo cadastrado no momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1E1F22] text-[#949BA4] border-b border-[#202225] uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Criador</th>
                    <th className="py-3 px-4">Plataforma</th>
                    <th className="py-3 px-4">Cupom na Loja</th>
                    <th className="py-3 px-4">Inscritos / Seguidores</th>
                    <th className="py-3 px-4">Recompensa Mensal</th>
                    <th className="py-3 px-4">Status</th>
                    {isLeader && <th className="py-3 px-4 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202225] text-[#DBDEE1]">
                  {influencers.map((inf) => (
                    <tr key={inf.id} className="hover:bg-[#313338] transition-colors">
                      <td className="py-3 px-4 font-medium text-[#F2F3F5] flex items-center gap-2">
                        <span>{inf.name}</span>
                        <a
                          href={inf.channelUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#949BA4] hover:text-[#5865F2]"
                          title="Abrir Canal"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1E1F22] text-[#DBDEE1]">
                          {inf.platform}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleCopyCoupon(inf.couponCode)}
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1E1F22] hover:bg-[#313338] text-[#5865F2] font-mono text-[11px] font-bold"
                          title="Copiar Cupom"
                        >
                          <Tag className="w-3 h-3" />
                          <span>{inf.couponCode}</span>
                          {copiedCoupon === inf.couponCode ? (
                            <Check className="w-3 h-3 text-[#23A55A]" />
                          ) : (
                            <Copy className="w-3 h-3 text-[#949BA4]" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#DBDEE1]">
                        {inf.subscribersCount.toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 px-4 text-[#949BA4] text-xs">
                        {inf.monthlyReward || "Padrão"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${getStatusBadge(inf.status)}`}>
                          {inf.status === "ACTIVE" ? "Ativo" : inf.status === "IN_TEST" ? "Em Teste" : "Pausado"}
                        </span>
                      </td>
                      {isLeader && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteCreator(inf.id, inf.name)}
                            className="p-1.5 text-[#949BA4] hover:text-[#DA373C] hover:bg-[#DA373C]/10 rounded"
                            title="Remover Parceria"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA: PAUTAS */}
      {activeTab === "ideas" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ideas.length === 0 ? (
            <div className="col-span-full p-8 text-center text-xs text-[#949BA4] bg-[#2B2D31] rounded-lg">
              Nenhuma sugestão de pauta de gravação cadastrada.
            </div>
          ) : (
            ideas.map((idea) => (
              <div
                key={idea.id}
                className="p-4 bg-[#2B2D31] border border-[#202225] rounded-lg flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#1E1F22] text-[#5865F2] font-mono">
                      {idea.targetServer}
                    </span>
                    {isLeader && (
                      <button
                        onClick={() => handleDeleteIdea(idea.id)}
                        className="text-[#949BA4] hover:text-[#DA373C]"
                        title="Excluir Pauta"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <h3 className="font-semibold text-[#F2F3F5] text-xs">{idea.title}</h3>
                  <p className="text-[#DBDEE1] text-[11px] mt-1 leading-relaxed">
                    {idea.description}
                  </p>
                </div>
                <div className="pt-2 border-t border-[#202225] flex items-center justify-between text-[10px] text-[#949BA4]">
                  <span>Status: {idea.status}</span>
                  <span>{new Date(idea.createdAt).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL: NOVO INFLUENCIADOR */}
      {isCreatorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#313338] border border-[#202225] w-full max-w-md rounded-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#202225] pb-3">
              <h3 className="font-bold text-sm text-[#F2F3F5] flex items-center gap-2">
                <Video className="w-4 h-4 text-[#5865F2]" />
                Cadastrar Influenciador Parceiro
              </h3>
              <button
                onClick={() => setIsCreatorModalOpen(false)}
                className="text-[#949BA4] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-[#DA373C]/20 border border-[#DA373C]/40 rounded text-[#DA373C] text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateCreator} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                    Nome do Criador
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: CanalPixelPlay"
                    className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                    Plataforma
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as any)}
                    className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                  >
                    <option value="YOUTUBE">YouTube</option>
                    <option value="TWITCH">Twitch</option>
                    <option value="TIKTOK">TikTok</option>
                    <option value="KICK">Kick</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                  Link do Canal / Perfil
                </label>
                <input
                  type="url"
                  required
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  placeholder="https://youtube.com/@canal"
                  className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                    Cupom da Loja CentralCart
                  </label>
                  <input
                    type="text"
                    required
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="ex: PIXELPLAY"
                    className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] uppercase font-mono focus:outline-none focus:border-[#5865F2]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                    Inscritos / Seguidores
                  </label>
                  <input
                    type="number"
                    value={subscribersCount}
                    onChange={(e) => setSubscribersCount(Number(e.target.value))}
                    placeholder="ex: 25000"
                    className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                  Recompensa Mensal (Coins / Itens)
                </label>
                <input
                  type="text"
                  value={monthlyReward}
                  onChange={(e) => setMonthlyReward(e.target.value)}
                  placeholder="ex: 2.000 Coins + 1 Caixa Mística"
                  className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#202225]">
                <button
                  type="button"
                  onClick={() => setIsCreatorModalOpen(false)}
                  className="px-3 py-2 text-[#DBDEE1] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-md"
                >
                  Salvar Parceiro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA PAUTA */}
      {isIdeaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#313338] border border-[#202225] w-full max-w-md rounded-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#202225] pb-3">
              <h3 className="font-bold text-sm text-[#F2F3F5] flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#F0B232]" />
                Sugerir Pauta de Vídeo
              </h3>
              <button
                onClick={() => setIsIdeaModalOpen(false)}
                className="text-[#949BA4] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateIdea} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                  Título da Pauta
                </label>
                <input
                  type="text"
                  required
                  value={ideaTitle}
                  onChange={(e) => setIdeaTitle(e.target.value)}
                  placeholder="ex: Batalha de Ginásios no Cyan com time mono-dragão"
                  className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2.5 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                  Descrição & Instruções
                </label>
                <textarea
                  rows={3}
                  required
                  value={ideaDesc}
                  onChange={(e) => setIdeaDesc(e.target.value)}
                  placeholder="Detalhes sobre o evento, pokémons e coordenadas..."
                  className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                  Servidor
                </label>
                <select
                  value={ideaServer}
                  onChange={(e) => setIdeaServer(e.target.value as any)}
                  className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                >
                  <option value="GLOBAL">Global (Ambos)</option>
                  <option value="CYAN">Cyan</option>
                  <option value="ORANGE">Orange</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#202225]">
                <button
                  type="button"
                  onClick={() => setIsIdeaModalOpen(false)}
                  className="px-3 py-2 text-[#DBDEE1] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-md"
                >
                  Criar Pauta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
