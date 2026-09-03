import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ShieldAlert, Plus, ExternalLink } from "lucide-react";
import { PunishFormClient } from "./punish-form";

export default async function PunicoesPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const punishments = await db.punishment.findMany({
    orderBy: { createdAt: "desc" },
    include: { staff: { select: { username: true, role: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#2B2D31] pb-5">
        <div>
          <h1 className="text-lg font-bold text-[#F2F3F5] tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#DA373C]" />
            Gestão de Punições & Infrações
          </h1>
          <p className="text-xs text-[#949BA4] mt-0.5">
            Registro formal de banimentos, silenciamentos e advertências com provas anexadas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário */}
        <div className="bg-[#2B2D31] border border-[#202225] rounded-lg p-5 space-y-4">
          <div className="border-b border-[#202225] pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#F2F3F5] flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#DA373C]" />
              Aplicar Nova Punição
            </h2>
            <p className="text-[11px] text-[#949BA4]">Mínimo necessário: MODERATOR</p>
          </div>

          <PunishFormClient userRole={session.role} />
        </div>

        {/* Histórico */}
        <div className="lg:col-span-2 bg-[#2B2D31] border border-[#202225] rounded-lg p-5 space-y-4">
          <div className="border-b border-[#202225] pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#F2F3F5]">
                Infrações Registradas
              </h2>
              <p className="text-[11px] text-[#949BA4]">Histórico de ações aplicadas</p>
            </div>
            <span className="text-[11px] font-mono text-[#949BA4]">
              Total: {punishments.length}
            </span>
          </div>

          {punishments.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#949BA4]">
              Nenhuma punição registrada no momento.
            </div>
          ) : (
            <div className="divide-y divide-[#202225]">
              {punishments.map((p) => (
                <div
                  key={p.id}
                  className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-[#313338] rounded transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#F2F3F5]">{p.playerName}</span>
                      <span className="px-2 py-0.5 bg-[#DA373C]/20 text-[#DA373C] rounded text-[10px] font-bold">
                        {p.type}
                      </span>
                      <span className="text-[10px] text-[#949BA4]">
                        UUID: {p.playerUuid.substring(0, 12)}...
                      </span>
                    </div>
                    <p className="text-[#DBDEE1] text-xs">{p.reason}</p>
                    <div className="flex items-center gap-3 text-[11px] text-[#949BA4]">
                      <span>Staff: {p.staff.username}</span>
                      <span>• Data: {new Date(p.createdAt).toLocaleDateString("pt-BR")}</span>
                      {p.proofUrl && (
                        <a
                          href={p.proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#5865F2] hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> Prova Anexada
                        </a>
                      )}
                    </div>
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
