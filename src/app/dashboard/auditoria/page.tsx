import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { History } from "lucide-react";

export default async function AuditoriaPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const logs = await db.auditLog.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: {
      actor: {
        select: {
          username: true,
          role: true,
          server: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#2B2D31] pb-5">
        <div>
          <h1 className="text-lg font-bold text-[#F2F3F5] tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-[#5865F2]" />
            Logs de Auditoria & Segurança
          </h1>
          <p className="text-xs text-[#949BA4] mt-0.5">
            Registro imutável de todas as ações executadas pela staff no painel
          </p>
        </div>
        <span className="text-[11px] font-mono text-[#949BA4]">
          Últimos {logs.length} eventos
        </span>
      </div>

      <div className="bg-[#2B2D31] border border-[#202225] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1E1F22] text-[#949BA4] border-b border-[#202225] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Evento / Ação</th>
                <th className="py-3 px-4">Autor</th>
                <th className="py-3 px-4">Cargo / Servidor</th>
                <th className="py-3 px-4">Detalhes</th>
                <th className="py-3 px-4">Endereço IP</th>
                <th className="py-3 px-4">Data e Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202225] text-[#DBDEE1]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#313338] transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-[#5865F2]">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 font-medium text-[#F2F3F5]">
                    {log.actor.username}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-1.5 py-0.2 text-[10px] font-medium rounded bg-[#1E1F22] text-[#DBDEE1]">
                      {log.actor.role} • {log.actor.server}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-[#949BA4] max-w-xs truncate">
                    {log.details || "-"}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-[#949BA4]">
                    {log.ipAddress}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-[#949BA4]">
                    {new Date(log.createdAt).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
