"use client";

import { useState, useEffect } from "react";
import {
  Users,
  CalendarDays,
  Clock,
  AlertTriangle,
  UserPlus,
  Check,
  X,
  Trash2,
  Edit2,
  CheckCircle2,
} from "lucide-react";

interface UserInfo {
  id?: string;
  userId?: string;
  username: string;
  role: string;
  server: string;
}

interface StaffMember {
  id: string;
  username: string;
  email: string;
  role: string;
  server: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    workShifts: number;
    warningsReceived: number;
    leaveRequests: number;
    punishments: number;
  };
}

interface AbsenceItem {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  reviewedById?: string;
  reviewNotes?: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    role: string;
    server: string;
  };
}

interface WarningItem {
  id: string;
  userId: string;
  staffId: string;
  severity: string;
  reason: string;
  proofUrl?: string;
  createdAt: string;
  user: { username: string; role: string; server: string };
  staff: { username: string; role: string };
}

interface OnDutyShift {
  id: string;
  server: string;
  startedAt: string;
  notes?: string;
  user: {
    id: string;
    username: string;
    role: string;
    server: string;
  };
}

interface TeamShift {
  id: string;
  server: string;
  startedAt: string;
  endedAt?: string;
  durationMinutes?: number;
  user: {
    id: string;
    username: string;
    role: string;
    server: string;
  };
}

export function RhDashboardClient({ currentUser }: { currentUser: UserInfo }) {
  const [activeTab, setActiveTab] = useState<"members" | "shifts" | "absences" | "warnings">("members");

  // Dados
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [absences, setAbsences] = useState<AbsenceItem[]>([]);
  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [onDutyStaff, setOnDutyStaff] = useState<OnDutyShift[]>([]);
  const [teamShifts, setTeamShifts] = useState<TeamShift[]>([]);

  // Modais
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);

  // Form Novo Membro
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "MODERATOR" | "HELPER">("HELPER");
  const [newServer, setNewServer] = useState<"CYAN" | "ORANGE" | "GLOBAL">("GLOBAL");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Form Editar Membro
  const [editRole, setEditRole] = useState<"ADMIN" | "MODERATOR" | "HELPER">("HELPER");
  const [editServer, setEditServer] = useState<"CYAN" | "ORANGE" | "GLOBAL">("GLOBAL");
  const [resetPassword, setResetPassword] = useState("");

  // Form Ausência
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  // Form Advertência
  const [warnUserId, setWarnUserId] = useState("");
  const [warnSeverity, setWarnSeverity] = useState<"VERBAL" | "WARN_1" | "WARN_2" | "REMOVAL">("WARN_1");
  const [warnReason, setWarnReason] = useState("");
  const [warnProof, setWarnProof] = useState("");

  const isLeader = currentUser.role === "OWNER" || currentUser.role === "ADMIN";

  const loadData = async () => {
    try {
      const [resMembers, resAbsences, resWarnings, resShifts] = await Promise.all([
        fetch("/api/rh/members").then((r) => r.json()),
        fetch("/api/rh/absence").then((r) => r.json()),
        fetch("/api/rh/warning").then((r) => r.json()),
        fetch("/api/rh/shift").then((r) => r.json()),
      ]);

      if (resMembers.members) setMembers(resMembers.members);
      if (resAbsences.absences) setAbsences(resAbsences.absences);
      if (resWarnings.warnings) setWarnings(resWarnings.warnings);
      if (resShifts.onDutyStaff) setOnDutyStaff(resShifts.onDutyStaff);
      if (resShifts.recentTeamShifts) setTeamShifts(resShifts.recentTeamShifts);
    } catch {}
  };

  useEffect(() => {
    loadData();

    const handleShiftUpdated = () => loadData();
    window.addEventListener("shift-updated", handleShiftUpdated);
    return () => window.removeEventListener("shift-updated", handleShiftUpdated);
  }, []);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    try {
      const res = await fetch("/api/rh/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          email: newEmail,
          password: newPassword,
          role: newRole,
          server: newServer,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Falha ao cadastrar membro.");
        return;
      }

      setFormSuccess(`Membro ${newUsername} criado com sucesso!`);
      setNewUsername("");
      setNewEmail("");
      setNewPassword("");
      loadData();
      setTimeout(() => {
        setIsNewMemberModalOpen(false);
        setFormSuccess(null);
      }, 1200);
    } catch {
      setFormError("Erro de comunicação com o servidor.");
    }
  };

  const handleOpenEdit = (member: StaffMember) => {
    setEditingMember(member);
    setEditRole(member.role as any);
    setEditServer(member.server as any);
    setResetPassword("");
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setFormError(null);

    try {
      const res = await fetch("/api/rh/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingMember.id,
          role: editRole,
          server: editServer,
          newPassword: resetPassword.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Falha ao atualizar membro.");
        return;
      }

      setIsEditModalOpen(false);
      loadData();
    } catch {
      setFormError("Erro ao comunicar com o servidor.");
    }
  };

  const handleDeleteMember = async (member: StaffMember) => {
    const confirmation = prompt(
      `ATENÇÃO: Você está prestes a excluir permanentemente o acesso de ${member.username}.\nTodas as sessões serão revogadas.\n\nPara confirmar, digite "${member.username}":`
    );

    if (confirmation !== member.username) {
      if (confirmation !== null) alert("Nome incorreto. Ação cancelada.");
      return;
    }

    try {
      const res = await fetch(`/api/rh/members?userId=${member.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erro ao remover membro.");
        return;
      }

      alert(`Acesso de ${member.username} removido.`);
      loadData();
    } catch {
      alert("Erro ao conectar com o servidor.");
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    await fetch("/api/rh/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, isActive: !currentActive }),
    });
    loadData();
  };

  const handleRequestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      const res = await fetch("/api/rh/absence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: new Date(leaveStart).toISOString(),
          endDate: new Date(leaveEnd).toISOString(),
          reason: leaveReason,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error || "Erro ao solicitar ausência.");
        return;
      }

      setLeaveReason("");
      setLeaveStart("");
      setLeaveEnd("");
      setIsLeaveModalOpen(false);
      loadData();
    } catch {
      setFormError("Erro de comunicação.");
    }
  };

  const handleReviewLeave = async (leaveId: string, status: "APPROVED" | "REJECTED") => {
    await fetch("/api/rh/absence", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaveId, status }),
    });
    loadData();
  };

  const handleCreateWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      const res = await fetch("/api/rh/warning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: warnUserId,
          severity: warnSeverity,
          reason: warnReason,
          proofUrl: warnProof || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error || "Erro ao aplicar advertência.");
        return;
      }

      setWarnReason("");
      setWarnProof("");
      setIsWarningModalOpen(false);
      loadData();
    } catch {
      setFormError("Erro de conexão.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#2B2D31] pb-5">
        <div>
          <h1 className="text-lg font-bold text-[#F2F3F5] tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#5865F2]" />
            Recursos Humanos & Gestão da Equipe
          </h1>
          <p className="text-xs text-[#949BA4] mt-0.5">
            Membros ativos, turnos em tempo real, solicitações de ausência e conduta
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isLeader && (
            <button
              onClick={() => {
                setFormError(null);
                setFormSuccess(null);
                setIsNewMemberModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Novo Acesso de Staff</span>
            </button>
          )}

          <button
            onClick={() => {
              setFormError(null);
              setIsLeaveModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4E5058] hover:bg-[#6D6F78] text-[#F2F3F5] text-xs font-medium rounded-md transition-colors"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Solicitar Ausência</span>
          </button>
        </div>
      </div>

      {/* Sub-Abas */}
      <div className="flex items-center gap-1.5 border-b border-[#2B2D31] pb-3 text-xs">
        <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition-colors ${
            activeTab === "members"
              ? "bg-[#35373C] text-[#F2F3F5]"
              : "text-[#949BA4] hover:text-[#DBDEE1]"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Membros ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("shifts")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition-colors ${
            activeTab === "shifts"
              ? "bg-[#35373C] text-[#F2F3F5]"
              : "text-[#949BA4] hover:text-[#DBDEE1]"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>
            Plantão Ao Vivo (
            <span className="text-[#23A55A] font-bold">{onDutyStaff.length} ativo</span>)
          </span>
        </button>

        <button
          onClick={() => setActiveTab("absences")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition-colors ${
            activeTab === "absences"
              ? "bg-[#35373C] text-[#F2F3F5]"
              : "text-[#949BA4] hover:text-[#DBDEE1]"
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Ausências ({absences.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("warnings")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition-colors ${
            activeTab === "warnings"
              ? "bg-[#35373C] text-[#F2F3F5]"
              : "text-[#949BA4] hover:text-[#DBDEE1]"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Ficha Disciplinar ({warnings.length})</span>
        </button>
      </div>

      {/* ABA: MEMBROS */}
      {activeTab === "members" && (
        <div className="bg-[#2B2D31] border border-[#202225] rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1E1F22] text-[#949BA4] border-b border-[#202225] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Cargo</th>
                  <th className="py-3 px-4">Servidor</th>
                  <th className="py-3 px-4">Turnos</th>
                  <th className="py-3 px-4">Cadastrado em</th>
                  <th className="py-3 px-4">Status</th>
                  {isLeader && <th className="py-3 px-4 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202225] text-[#DBDEE1]">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-[#313338] transition-colors">
                    <td className="py-3 px-4 font-medium text-[#F2F3F5] flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#5865F2] flex items-center justify-center text-[10px] font-bold text-white">
                        {m.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span>{m.username}</span>
                        <span className="block text-[10px] text-[#949BA4]">{m.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#1E1F22] text-[#F2F3F5]">
                        {m.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-[#1E1F22] text-[#949BA4]">
                        {m.server}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#949BA4]">
                      {m._count.workShifts} turnos
                    </td>
                    <td className="py-3 px-4 text-[#949BA4] text-[11px]">
                      {new Date(m.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-3 px-4">
                      {m.isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#23A55A] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#23A55A]" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#DA373C] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#DA373C]" />
                          Suspenso
                        </span>
                      )}
                    </td>
                    {isLeader && (
                      <td className="py-3 px-4 text-right">
                        {m.role !== "OWNER" && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(m)}
                              className="p-1.5 text-[#949BA4] hover:text-[#F2F3F5] hover:bg-[#1E1F22] rounded"
                              title="Editar Cargo / Resetar Senha"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(m.id, m.isActive)}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                m.isActive
                                  ? "bg-[#DA373C]/20 text-[#DA373C] hover:bg-[#DA373C]/30"
                                  : "bg-[#23A55A]/20 text-[#23A55A] hover:bg-[#23A55A]/30"
                              }`}
                            >
                              {m.isActive ? "Suspender" : "Ativar"}
                            </button>
                            <button
                              onClick={() => handleDeleteMember(m)}
                              className="p-1.5 text-[#949BA4] hover:text-[#DA373C] hover:bg-[#DA373C]/10 rounded"
                              title="Excluir Permanentemente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA: REGISTROS & PLANTÃO AO VIVO */}
      {activeTab === "shifts" && (
        <div className="space-y-5">
          <div className="bg-[#2B2D31] border border-[#202225] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#202225] pb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#F2F3F5] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#23A55A]" />
                Membros em Plantão Agora ({onDutyStaff.length})
              </h2>
            </div>

            {onDutyStaff.length === 0 ? (
              <p className="text-xs text-[#949BA4] py-4 text-center">
                Nenhum membro da staff está com o ponto aberto no momento.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {onDutyStaff.map((shift) => (
                  <div
                    key={shift.id}
                    className="p-3 bg-[#313338] rounded-md space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#F2F3F5] text-xs">{shift.user.username}</span>
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-[#1E1F22] text-[#DBDEE1]">
                        {shift.user.role}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#949BA4] font-mono">
                      <span>Servidor: {shift.server}</span>
                      <span className="text-[#23A55A]">
                        Desde às {new Date(shift.startedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#2B2D31] border border-[#202225] rounded-lg p-4 space-y-3">
            <div className="border-b border-[#202225] pb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#F2F3F5]">
                Histórico Recente de Turnos Fechados
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1E1F22] text-[#949BA4] border-b border-[#202225] uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Membro</th>
                    <th className="py-3 px-4">Servidor</th>
                    <th className="py-3 px-4">Início</th>
                    <th className="py-3 px-4">Término</th>
                    <th className="py-3 px-4">Duração Cumprida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202225] text-[#DBDEE1]">
                  {teamShifts.map((sh) => (
                    <tr key={sh.id} className="hover:bg-[#313338]">
                      <td className="py-3 px-4 font-medium text-[#F2F3F5]">
                        {sh.user.username} ({sh.user.role})
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {sh.server}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#949BA4]">
                        {new Date(sh.startedAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#949BA4]">
                        {sh.endedAt ? new Date(sh.endedAt).toLocaleTimeString("pt-BR") : "Em andamento"}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#5865F2]">
                        {sh.durationMinutes ? `${sh.durationMinutes} min` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA: AUSÊNCIAS */}
      {activeTab === "absences" && (
        <div className="bg-[#2B2D31] border border-[#202225] rounded-lg overflow-hidden shadow-sm">
          {absences.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#949BA4]">
              Nenhuma solicitação de ausência registrada.
            </div>
          ) : (
            <div className="divide-y divide-[#202225]">
              {absences.map((abs) => (
                <div key={abs.id} className="p-4 hover:bg-[#313338] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#F2F3F5]">{abs.user.username}</span>
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-[#1E1F22] text-[#DBDEE1]">
                        {abs.user.role}
                      </span>
                    </div>
                    <p className="text-[#DBDEE1] text-xs">{abs.reason}</p>
                    <div className="text-[11px] text-[#949BA4] font-mono">
                      Período: {new Date(abs.startDate).toLocaleDateString("pt-BR")} até{" "}
                      {new Date(abs.endDate).toLocaleDateString("pt-BR")}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {abs.status === "PENDING" && isLeader && (
                      <>
                        <button
                          onClick={() => handleReviewLeave(abs.id, "APPROVED")}
                          className="px-2.5 py-1 bg-[#23A55A] hover:bg-[#1F9250] text-white rounded text-[11px] font-medium transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Aprovar
                        </button>
                        <button
                          onClick={() => handleReviewLeave(abs.id, "REJECTED")}
                          className="px-2.5 py-1 bg-[#DA373C] hover:bg-[#A12828] text-white rounded text-[11px] font-medium transition-colors flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> Recusar
                        </button>
                      </>
                    )}
                    {abs.status === "APPROVED" && (
                      <span className="px-2 py-0.5 bg-[#23A55A]/20 text-[#23A55A] rounded text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> APROVADO
                      </span>
                    )}
                    {abs.status === "REJECTED" && (
                      <span className="px-2 py-0.5 bg-[#DA373C]/20 text-[#DA373C] rounded text-[10px] font-bold">
                        RECUSADO
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA: ADVERTÊNCIAS */}
      {activeTab === "warnings" && (
        <div className="space-y-4">
          {isLeader && (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setFormError(null);
                  setIsWarningModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#DA373C] hover:bg-[#A12828] text-white text-xs font-semibold rounded-md transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Aplicar Advertência</span>
              </button>
            </div>
          )}

          <div className="bg-[#2B2D31] border border-[#202225] rounded-lg overflow-hidden shadow-sm">
            {warnings.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#949BA4]">
                Nenhuma advertência registrada para a equipe.
              </div>
            ) : (
              <div className="divide-y divide-[#202225]">
                {warnings.map((w) => (
                  <div key={w.id} className="p-4 hover:bg-[#313338] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#DA373C]/20 text-[#DA373C]">
                          {w.severity}
                        </span>
                        <span className="font-semibold text-[#F2F3F5]">
                          Membro: {w.user.username}
                        </span>
                        <span className="text-[#949BA4]">• Por {w.staff.username}</span>
                      </div>
                      <p className="text-[#DBDEE1]">{w.reason}</p>
                      <div className="text-[11px] text-[#949BA4] font-mono">
                        Data: {new Date(w.createdAt).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: NOVO MEMBRO */}
      {isNewMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#313338] border border-[#202225] w-full max-w-md rounded-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#202225] pb-3">
              <h3 className="font-bold text-sm text-[#F2F3F5] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#5865F2]" />
                Criar Acesso de Staff
              </h3>
              <button
                onClick={() => setIsNewMemberModalOpen(false)}
                className="text-[#949BA4] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-[#DA373C]/20 border border-[#DA373C]/40 rounded text-[#DA373C] text-xs">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-2.5 bg-[#23A55A]/20 border border-[#23A55A]/40 rounded text-[#23A55A] text-xs">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleCreateMember} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                  Nome de Usuário (Nick)
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="ex: AshKetchum"
                  className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                  E-mail de Contato
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="staff@netpixelmon.com"
                  className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                  Senha Provisória
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                    Cargo Inicial
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                  >
                    <option value="HELPER">HELPER</option>
                    <option value="MODERATOR">MODERATOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                    Servidor Atribuído
                  </label>
                  <select
                    value={newServer}
                    onChange={(e) => setNewServer(e.target.value as any)}
                    className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                  >
                    <option value="GLOBAL">GLOBAL (Ambos)</option>
                    <option value="CYAN">CYAN</option>
                    <option value="ORANGE">ORANGE</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#202225]">
                <button
                  type="button"
                  onClick={() => setIsNewMemberModalOpen(false)}
                  className="px-3 py-2 text-[#DBDEE1] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-md"
                >
                  Criar Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR MEMBRO / RESET DE SENHA */}
      {isEditModalOpen && editingMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#313338] border border-[#202225] w-full max-w-md rounded-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#202225] pb-3">
              <h3 className="font-bold text-sm text-[#F2F3F5] flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#5865F2]" />
                Editar Acesso de {editingMember.username}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#949BA4] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-[#DA373C]/20 border border-[#DA373C]/40 rounded text-[#DA373C] text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                    Cargo
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                  >
                    <option value="HELPER">HELPER</option>
                    <option value="MODERATOR">MODERATOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                    Servidor Atribuído
                  </label>
                  <select
                    value={editServer}
                    onChange={(e) => setEditServer(e.target.value as any)}
                    className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                  >
                    <option value="GLOBAL">GLOBAL (Ambos)</option>
                    <option value="CYAN">CYAN</option>
                    <option value="ORANGE">ORANGE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                  Redefinir Senha (Opcional)
                </label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Deixe em branco para manter a atual"
                  className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#202225]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-2 text-[#DBDEE1] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-md"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SOLICITAR AUSÊNCIA */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#313338] border border-[#202225] w-full max-w-md rounded-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#202225] pb-3">
              <h3 className="font-bold text-sm text-[#F2F3F5] flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#5865F2]" />
                Solicitar Ausência Justificada
              </h3>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="text-[#949BA4] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRequestLeave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                    Início
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                    Término
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                  Motivo
                </label>
                <textarea
                  rows={3}
                  required
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Explique o motivo para análise dos administradores..."
                  className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#202225]">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-3 py-2 text-[#DBDEE1] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-md"
                >
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: APLICAR ADVERTÊNCIA */}
      {isWarningModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#313338] border border-[#202225] w-full max-w-md rounded-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#202225] pb-3">
              <h3 className="font-bold text-sm text-[#F2F3F5] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#DA373C]" />
                Aplicar Advertência
              </h3>
              <button
                onClick={() => setIsWarningModalOpen(false)}
                className="text-[#949BA4] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWarning} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                  Membro
                </label>
                <select
                  required
                  value={warnUserId}
                  onChange={(e) => setWarnUserId(e.target.value)}
                  className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#DA373C]"
                >
                  <option value="">Selecione o membro...</option>
                  {members
                    .filter((m) => m.role !== "OWNER")
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.username} ({m.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                  Gravidade
                </label>
                <select
                  value={warnSeverity}
                  onChange={(e) => setWarnSeverity(e.target.value as any)}
                  className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#DA373C]"
                >
                  <option value="VERBAL">Notificação Verbal</option>
                  <option value="WARN_1">Advertência Nível 1</option>
                  <option value="WARN_2">Advertência Nível 2</option>
                  <option value="REMOVAL">Exoneração / Remoção</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#DBDEE1] mb-1">
                  Motivo
                </label>
                <textarea
                  rows={3}
                  required
                  value={warnReason}
                  onChange={(e) => setWarnReason(e.target.value)}
                  placeholder="Descreva a conduta..."
                  className="w-full bg-[#1E1F22] border border-[#202225] rounded-md p-2 text-[#F2F3F5] focus:outline-none focus:border-[#DA373C]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#202225]">
                <button
                  type="button"
                  onClick={() => setIsWarningModalOpen(false)}
                  className="px-3 py-2 text-[#DBDEE1] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#DA373C] hover:bg-[#A12828] text-white font-semibold rounded-md"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
