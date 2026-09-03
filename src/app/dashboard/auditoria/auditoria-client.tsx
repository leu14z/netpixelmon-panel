"use client";

import { useState, useMemo } from "react";
import {
  History,
  Search,
  LogIn,
  UserPlus,
  UserMinus,
  UserCheck,
  Calendar,
  ShieldAlert,
  Radio,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
} from "lucide-react";

export interface AuditLogItem {
  id: string;
  action: string;
  actor: {
    username: string;
    role: string;
    server: string;
  };
  details: string | null;
  ipAddress: string;
  createdAt: string;
}

interface AuditoriaClientProps {
  logs: AuditLogItem[];
}

// Configuração visual para cada tipo de evento
const ACTION_CONFIG: Record<
  string,
  { label: string; icon: any; badgeClass: string; category: string }
> = {
  LOGIN_SUCCESS: {
    label: "Login Efetuado",
    icon: LogIn,
    badgeClass: "bg-[#23A55A]/15 text-[#23A55A] border-[#23A55A]/30",
    category: "AUTH",
  },
  LOGIN_FAILED: {
    label: "Falha de Login",
    icon: AlertTriangle,
    badgeClass: "bg-[#DA373C]/15 text-[#DA373C] border-[#DA373C]/30",
    category: "AUTH",
  },
  STAFF_CREATE: {
    label: "Membro Criado",
    icon: UserPlus,
    badgeClass: "bg-[#5865F2]/15 text-[#5865F2] border-[#5865F2]/30",
    category: "STAFF",
  },
  STAFF_UPDATE: {
    label: "Membro Editado",
    icon: UserCheck,
    badgeClass: "bg-[#F0B232]/15 text-[#F0B232] border-[#F0B232]/30",
    category: "STAFF",
  },
  STAFF_DELETE: {
    label: "Membro Removido",
    icon: UserMinus,
    badgeClass: "bg-[#DA373C]/15 text-[#DA373C] border-[#DA373C]/30",
    category: "STAFF",
  },
  LEAVE_REQUEST: {
    label: "Pedido de Licença",
    icon: Calendar,
    badgeClass: "bg-[#F0B232]/15 text-[#F0B232] border-[#F0B232]/30",
    category: "LEAVE",
  },
  LEAVE_APPROVE: {
    label: "Licença Aprovada",
    icon: CheckCircle2,
    badgeClass: "bg-[#23A55A]/15 text-[#23A55A] border-[#23A55A]/30",
    category: "LEAVE",
  },
  LEAVE_REJECT: {
    label: "Licença Rejeitada",
    icon: XCircle,
    badgeClass: "bg-[#DA373C]/15 text-[#DA373C] border-[#DA373C]/30",
    category: "LEAVE",
  },
  SUPPORT_ROOM_CREATE: {
    label: "Sala de Suporte",
    icon: Radio,
    badgeClass: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    category: "SUPPORT",
  },
  PROFILE_UPDATE: {
    label: "Perfil Atualizado",
    icon: User,
    badgeClass: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    category: "STAFF",
  },
  PUNISH_CREATE: {
    label: "Punição Aplicada",
    icon: ShieldAlert,
    badgeClass: "bg-[#DA373C]/15 text-[#DA373C] border-[#DA373C]/30",
    category: "PUNISH",
  },
  WARNING_APPLY: {
    label: "Advertência Staff",
    icon: AlertTriangle,
    badgeClass: "bg-[#F0B232]/15 text-[#F0B232] border-[#F0B232]/30",
    category: "STAFF",
  },
};

// Tradutor amigável e humano para o campo "detalhes"
function formatHumanDetails(action: string, detailsRaw: string | null): string {
  if (!detailsRaw) return "Nenhum detalhe adicional.";

  try {
    const data = JSON.parse(detailsRaw);

    switch (action) {
      case "LOGIN_SUCCESS":
        return `Acessou o painel no servidor ${data.server || "GLOBAL"}`;

      case "LOGIN_FAILED":
        return `Tentativa inválida para o usuário "${data.username || "Desconhecido"}"`;

      case "STAFF_CREATE":
        return `Cadastrou ${data.username} como ${data.role || "HELPER"} (${data.server || "GLOBAL"})`;

      case "STAFF_UPDATE":
        return `Alterou cargo ou dados de ${data.username || "membro"}`;

      case "STAFF_DELETE":
        return `Excluiu permanentemente o acesso do membro da staff`;

      case "LEAVE_REQUEST":
        if (data.startDate && data.endDate) {
          const start = new Date(data.startDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
          const end = new Date(data.endDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
          return `Solicitou afastamento de ${start} até ${end}`;
        }
        return "Solicitou período de ausência/licença";

      case "LEAVE_APPROVE":
        return `Aprovou a licença do membro ${data.targetUser || ""}`;

      case "LEAVE_REJECT":
        return `Recusou a licença do membro ${data.targetUser || ""}`;

      case "SUPPORT_ROOM_CREATE":
        return `Abriu a sala ${data.code || ""} para atender o jogador "${data.playerNick || ""}"`;

      case "PROFILE_UPDATE": {
        const changes = [];
        if (data.changedAvatar) changes.push("foto de perfil");
        if (data.changedDiscord) changes.push("Discord");
        if (data.changedPassword) changes.push("senha");
        return `Atualizou ${changes.length > 0 ? changes.join(", ") : "dados da conta"}`;
      }

      case "PUNISH_CREATE":
        return `Puniu ${data.playerName} (${data.type}) • Motivo: ${data.reason || "Não especificado"}`;

      case "WARNING_APPLY":
        return `Advertiu ${data.targetUser} (+${data.points || 1} pontos) • ${data.reason || ""}`;

      case "INFLUENCER_CREATE":
        return `Adicionou criador ${data.name} (Cupom: ${data.couponCode || "-"})`;

      default:
        // Caso não seja mapeado diretamente, exibe os valores de forma amigável
        return Object.entries(data)
          .map(([k, v]) => `${k}: ${v}`)
          .join(" • ");
    }
  } catch {
    // Se não for JSON, retorna o texto puro
    return detailsRaw;
  }
}

export function AuditoriaClient({ logs }: AuditoriaClientProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const categories = [
    { id: "ALL", label: "Todos os Eventos" },
    { id: "AUTH", label: "Logins & Acessos" },
    { id: "STAFF", label: "Equipe & Membros" },
    { id: "LEAVE", label: "Licenças & RH" },
    { id: "SUPPORT", label: "Salas de Suporte" },
    { id: "PUNISH", label: "Punições" },
  ];

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const config = ACTION_CONFIG[log.action] || {
        label: log.action,
        category: "OTHER",
      };

      // Filtro de Categoria
      if (categoryFilter !== "ALL" && config.category !== categoryFilter) {
        return false;
      }

      // Filtro de Busca
      if (search.trim()) {
        const term = search.toLowerCase();
        const authorMatch = log.actor.username.toLowerCase().includes(term);
        const actionMatch = config.label.toLowerCase().includes(term);
        const ipMatch = log.ipAddress.includes(term);
        const detailsMatch = (log.details || "").toLowerCase().includes(term);

        return authorMatch || actionMatch || ipMatch || detailsMatch;
      }

      return true;
    });
  }, [logs, search, categoryFilter]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#2B2D31] pb-5">
        <div>
          <h1 className="text-lg font-bold text-[#F2F3F5] tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-[#5865F2]" />
            Logs de Auditoria & Segurança
          </h1>
          <p className="text-xs text-[#949BA4] mt-0.5">
            Histórico detalhado e humanizado de todas as operações realizadas na staff
          </p>
        </div>

        <div className="text-xs text-[#949BA4] bg-[#2B2D31] px-3 py-1.5 rounded-md border border-[#202225] self-start sm:self-auto">
          Mostrando <b className="text-[#F2F3F5]">{filteredLogs.length}</b> de {logs.length} registros
        </div>
      </div>

      {/* Barra de Filtros & Pesquisa */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#2B2D31] p-3 rounded-lg border border-[#202225]">
        {/* Categorias */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2.5 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                categoryFilter === cat.id
                  ? "bg-[#5865F2] text-white"
                  : "bg-[#1E1F22] text-[#949BA4] hover:text-[#DBDEE1] hover:bg-[#35373C]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Input de Busca */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#949BA4]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar autor, IP ou ação..."
            className="w-full bg-[#1E1F22] border border-[#202225] rounded-md pl-8 pr-3 py-1.5 text-xs text-[#F2F3F5] placeholder-[#949BA4] focus:outline-none focus:border-[#5865F2]"
          />
        </div>
      </div>

      {/* Tabela Formatada Estilo Discord */}
      <div className="bg-[#2B2D31] border border-[#202225] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1E1F22] text-[#949BA4] border-b border-[#202225] uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Ação / Evento</th>
                <th className="py-3 px-4">Responsável</th>
                <th className="py-3 px-4">Descrição da Atividade</th>
                <th className="py-3 px-4">IP</th>
                <th className="py-3 px-4">Horário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202225] text-[#DBDEE1]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-xs text-[#949BA4]">
                    Nenhum registro encontrado para este filtro ou pesquisa.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const config = ACTION_CONFIG[log.action] || {
                    label: log.action.replace(/_/g, " "),
                    icon: Info,
                    badgeClass: "bg-[#4E5058]/20 text-[#DBDEE1] border-[#4E5058]/30",
                  };
                  const Icon = config.icon;
                  const humanDesc = formatHumanDetails(log.action, log.details);

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-[#313338] transition-colors cursor-pointer"
                      title="Clique para ver os detalhes completos"
                    >
                      {/* Selo do Evento */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${config.badgeClass}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{config.label}</span>
                        </span>
                      </td>

                      {/* Autor da Ação */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#5865F2] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                            {log.actor.username.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-[#F2F3F5] block leading-tight">
                              {log.actor.username}
                            </span>
                            <span className="text-[10px] text-[#949BA4] font-mono leading-tight">
                              {log.actor.role} • {log.actor.server}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Descrição Humanizada */}
                      <td className="py-3 px-4 text-[#DBDEE1] max-w-md">
                        <span className="leading-relaxed block truncate" title={humanDesc}>
                          {humanDesc}
                        </span>
                      </td>

                      {/* Endereço IP */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] text-[#949BA4] bg-[#1E1F22] px-2 py-0.5 rounded border border-[#202225]">
                          {log.ipAddress}
                        </span>
                      </td>

                      {/* Data e Hora */}
                      <td className="py-3 px-4 whitespace-nowrap text-[#949BA4] text-[11px]">
                        {new Date(log.createdAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhes Adicionais (ao clicar em uma linha) */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#2B2D31] border border-[#202225] rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#202225] pb-3">
              <h3 className="text-sm font-bold text-[#F2F3F5] flex items-center gap-2">
                <Info className="w-4 h-4 text-[#5865F2]" />
                Detalhes Técnicos do Log
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-[#949BA4] hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-[#1E1F22] p-3 rounded-lg border border-[#202225]">
                <div>
                  <span className="text-[10px] uppercase text-[#949BA4] block font-bold">Autor</span>
                  <span className="font-semibold text-[#F2F3F5]">{selectedLog.actor.username}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[#949BA4] block font-bold">Cargo & Servidor</span>
                  <span className="text-[#DBDEE1]">{selectedLog.actor.role} • {selectedLog.actor.server}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[#949BA4] block font-bold">Endereço IP</span>
                  <span className="font-mono text-[#DBDEE1]">{selectedLog.ipAddress}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[#949BA4] block font-bold">Data do Evento</span>
                  <span className="text-[#DBDEE1]">{new Date(selectedLog.createdAt).toLocaleString("pt-BR")}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase text-[#949BA4] block font-bold mb-1">
                  Ação Executada
                </span>
                <p className="p-2.5 bg-[#1E1F22] rounded-md text-[#F2F3F5] border border-[#202225] font-medium">
                  {formatHumanDetails(selectedLog.action, selectedLog.details)}
                </p>
              </div>

              {selectedLog.details && (
                <div>
                  <span className="text-[10px] uppercase text-[#949BA4] block font-bold mb-1">
                    Payload Bruto (JSON)
                  </span>
                  <pre className="p-2.5 bg-[#1E1F22] rounded-md text-[#949BA4] border border-[#202225] font-mono text-[11px] overflow-x-auto">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedLog.details), null, 2);
                      } catch {
                        return selectedLog.details;
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-[#4E5058] hover:bg-[#6D6F78] text-white rounded-md text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
