import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AuditoriaClient, AuditLogItem } from "./auditoria-client";

export default async function AuditoriaPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const logs = await db.auditLog.findMany({
    take: 100,
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

  const serializedLogs: AuditLogItem[] = logs.map((log) => ({
    id: log.id,
    action: log.action,
    actor: {
      username: log.actor.username,
      role: log.actor.role,
      server: log.actor.server,
    },
    details: log.details,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt.toISOString(),
  }));

  return <AuditoriaClient logs={serializedLogs} />;
}
