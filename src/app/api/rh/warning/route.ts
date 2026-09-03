import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthSession, hasPermission, PERMISSIONS } from "@/lib/auth";

const warningSchema = z.object({
  userId: z.string().min(1, "ID do membro é obrigatório"),
  severity: z.enum(["VERBAL", "WARN_1", "WARN_2", "REMOVAL"]),
  reason: z.string().min(8, "Motivo deve ter no mínimo 8 caracteres"),
  proofUrl: z.string().url("URL de evidência inválida").optional().or(z.literal("")),
});

// LISTAR ADVERTÊNCIAS
export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const isLeader = hasPermission(session.role, PERMISSIONS.HR_MANAGE);

  const warnings = await db.warning.findMany({
    where: isLeader ? {} : { userId: session.userId },
    include: {
      user: { select: { id: true, username: true, role: true, server: true } },
      staff: { select: { id: true, username: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ warnings });
}

// APLICAR NOVA ADVERTÊNCIA (Liderança)
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session || !hasPermission(session.role, PERMISSIONS.HR_MANAGE)) {
      return NextResponse.json(
        { error: "Apenas administradores e o dono podem aplicar advertências." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parseResult = warningSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, severity, reason, proofUrl } = parseResult.data;

    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 });
    }

    const warning = await db.warning.create({
      data: {
        userId,
        staffId: session.userId,
        severity,
        reason,
        proofUrl: proofUrl || null,
      },
      include: {
        user: { select: { username: true } },
      },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    await db.auditLog.create({
      data: {
        actorId: session.userId,
        action: "STAFF_WARNING",
        target: userId,
        details: JSON.stringify({
          targetUser: targetUser.username,
          severity,
          reason,
        }),
        ipAddress: ip,
      },
    });

    return NextResponse.json({
      success: true,
      warning,
      message: `Advertência aplicada ao membro ${targetUser.username}!`,
    });
  } catch (error) {
    console.error("Erro ao aplicar advertência:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}
