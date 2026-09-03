import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  Users,
  CalendarDays,
  ArrowRight,
  AlertTriangle,
  History,
  Radio,
  FileText,
  Bug,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getAuthSession();
  if (!session) return null;

  const [
    totalMembers,
    _activeRooms,
    activeLeaves,
    recentPunishments,
    recentLogs,
    onDutyShifts,
    openBugsCount,
  ] = await Promise.all([
    db.user.count({ where: { isActive: true } }),
    db.supportRoom.count({ where: { status: "ACTIVE" } }),
    db.leaveRequest.findMany({
      where: { status: "APPROVED", endDate: { gte: new Date() } },
      include: { user: { select: { username: true, role: true, server: true } } },
      take: 5,
    }),
    db.punishment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { staff: { select: { username: true } } },
    }),
    db.auditLog.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { username: true, role: true } } },
    }),
    db.workShift.findMany({
      where: { endedAt: null },
      include: { user: { select: { username: true, role: true, server: true } } },
      orderBy: { startedAt: "desc" },
    }),
    db.bugReport.count({ where: { status: { in: ["RECEBIDO", "INVESTIGANDO"] } } }),
  ]);

  return (
    <div className="space-y-6">
      {/* Top Banner Operacional */}
      <div className="bg-[#2B2D31] border border-[#202225] rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-base font-bold text-[#F2F3F5] tracking-tight">
              Olá, {session.username}
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#5865F2]/20 text-[#5865F2]">
              {session.role}
            </span>
            <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-[#1E1F22] text-[#DBDEE1]">
              {session.server}
            </span>
          </div>
          <p className="text-xs text-[#949BA4]">
            Painel de operações internas, triagem de chamados e registros da equipe NetPixelmon.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/suporte"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold rounded-md transition-colors"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Criar Sala WebRTC</span>
          </Link>
          <Link
            href="/dashboard/anotacoes"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4E5058] hover:bg-[#6D6F78] text-[#F2F3F5] text-xs font-medium rounded-md transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ver Anotações</span>
          </Link>
        </div>
      </div>

      {/* Métricas Compactas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#2B2D31] border border-[#202225] rounded-lg p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[#949BA4]">
            <span className="text-xs font-medium">Plantão Agora</span>
            <span className="w-2 h-2 rounded-full bg-[#23A55A]" />
          </div>
          <div className="text-xl font-bold text-[#F2F3F5] font-mono">
            {onDutyShifts.length}
          </div>
          <p className="text-[10px] text-[#949BA4]">Staffs online no ponto</p>
        </div>

        <div className="bg-[#2B2D31] border border-[#202225] rounded-lg p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[#949BA4]">
            <span className="text-xs font-medium">Bugs em Aberto</span>
            <Bug className="w-3.5 h-3.5 text-[#DA373C]" />
          </div>
          <div className="text-xl font-bold text-[#F2F3F5] font-mono">
            {openBugsCount}
          </div>
          <p className="text-[10px] text-[#949BA4]">Aguardando resolução</p>
        </div>

        <div className="bg-[#2B2D31] border border-[#202225] rounded-lg p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[#949BA4]">
            <span className="text-xs font-medium">Equipe Total</span>
            <Users className="w-3.5 h-3.5 text-[#949BA4]" />
          </div>
          <div className="text-xl font-bold text-[#F2F3F5] font-mono">
            {totalMembers}
          </div>
          <p className="text-[10px] text-[#949BA4]">Contas registradas</p>
        </div>

        <div className="bg-[#2B2D31] border border-[#202225] rounded-lg p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[#949BA4]">
            <span className="text-xs font-medium">Ausências Ativas</span>
            <CalendarDays className="w-3.5 h-3.5 text-[#F0B232]" />
          </div>
          <div className="text-xl font-bold text-[#F2F3F5] font-mono">
            {activeLeaves.length}
          </div>
          <p className="text-[10px] text-[#949BA4]">Recessos justificados</p>
        </div>
      </div>

      {/* Grid Central */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Coluna 1 & 2: Plantão Ao Vivo & Punições Recentes */}
        <div className="lg:col-span-2 space-y-5">
          {/* Staffs em Plantão */}
          <div className="bg-[#2B2D31] border border-[#202225] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#202225] pb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#F2F3F5] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#23A55A]" />
                Staffs em Plantão Agora ({onDutyShifts.length})
              </h2>
              <span className="text-[10px] text-[#23A55A] font-medium">
                Atualizado ao vivo
              </span>
            </div>

            {onDutyShifts.length === 0 ? (
              <p className="text-xs text-[#949BA4] py-4 text-center">
                Nenhum membro da staff está com o ponto aberto neste momento.
              </p>
            ) : (
              <div className="divide-y divide-[#202225]">
                {onDutyShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="py-2.5 flex items-center justify-between text-xs hover:bg-[#313338] px-2 rounded transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#5865F2] flex items-center justify-center text-[10px] font-bold text-white">
                        {shift.user.username.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-semibold text-[#F2F3F5]">{shift.user.username}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#1E1F22] text-[#DBDEE1]">
                        {shift.user.role}
                      </span>
                      <span className="text-[10px] text-[#949BA4]">
                        • {shift.server}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#949BA4]">
                      Desde às {new Date(shift.startedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Últimas Punições */}
          <div className="bg-[#2B2D31] border border-[#202225] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#202225] pb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#F2F3F5] flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-[#F0B232]" />
                Últimas Infrações Aplicadas
              </h2>
              <Link
                href="/dashboard/punicoes"
                className="text-[11px] text-[#5865F2] hover:underline flex items-center gap-1"
              >
                Ver todas <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentPunishments.length === 0 ? (
              <p className="text-xs text-[#949BA4] py-4 text-center">
                Nenhuma punição registrada recentemente.
              </p>
            ) : (
              <div className="divide-y divide-[#202225]">
                {recentPunishments.map((p) => (
                  <div
                    key={p.id}
                    className="py-2.5 px-2 flex items-center justify-between text-xs hover:bg-[#313338] rounded transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#F2F3F5]">{p.playerName}</span>
                        <span className="px-1.5 py-0.2 bg-[#DA373C]/20 text-[#DA373C] rounded text-[9px] font-bold">
                          {p.type}
                        </span>
                      </div>
                      <p className="text-[#DBDEE1] text-[11px]">{p.reason}</p>
                    </div>
                    <span className="text-[11px] text-[#949BA4]">
                      Staff: {p.staff.username}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coluna 3: Ausências & Auditoria */}
        <div className="space-y-5">
          {/* Membros em Ausência */}
          <div className="bg-[#2B2D31] border border-[#202225] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#202225] pb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#F2F3F5] flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-[#F0B232]" />
                Ausências Justificadas
              </h2>
              <Link
                href="/dashboard/rh"
                className="text-[11px] text-[#5865F2] hover:underline"
              >
                Gerenciar
              </Link>
            </div>

            {activeLeaves.length === 0 ? (
              <p className="text-xs text-[#949BA4] py-4 text-center">
                Toda a equipe está ativa hoje.
              </p>
            ) : (
              <div className="space-y-2">
                {activeLeaves.map((l) => (
                  <div
                    key={l.id}
                    className="p-2.5 bg-[#313338] rounded-md text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#F2F3F5]">{l.user.username}</span>
                      <span className="text-[10px] text-[#F0B232]">Até {new Date(l.endDate).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <p className="text-[11px] text-[#949BA4] truncate">{l.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feed de Auditoria */}
          <div className="bg-[#2B2D31] border border-[#202225] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#202225] pb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#F2F3F5] flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-[#5865F2]" />
                Auditoria & Segurança
              </h2>
              <span className="text-[10px] text-[#949BA4]">Ao Vivo</span>
            </div>

            <div className="space-y-1.5">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2 bg-[#313338] rounded-md text-xs space-y-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#5865F2] font-semibold">
                      {log.action}
                    </span>
                    <span className="text-[9px] text-[#949BA4]">
                      {new Date(log.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#DBDEE1] truncate">
                    Por {log.actor.username} ({log.actor.role})
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
