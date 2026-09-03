import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthSession, hasPermission, PERMISSIONS } from "@/lib/auth";

const leaveSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().min(10, "Explique o motivo da ausência com pelo menos 10 caracteres"),
});

// LISTAR SOLICITAÇÕES DE AUSÊNCIA
export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const isLeader = hasPermission(session.role, PERMISSIONS.HR_MANAGE);

  const absences = await db.leaveRequest.findMany({
    where: isLeader ? {} : { userId: session.userId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          role: true,
          server: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ absences });
}

// SOLICITAR AUSÊNCIA
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = leaveSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { startDate, endDate, reason } = parseResult.data;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return NextResponse.json(
        { error: "A data final deve ser posterior à data inicial." },
        { status: 400 }
      );
    }

    const leave = await db.leaveRequest.create({
      data: {
        userId: session.userId,
        startDate: start,
        endDate: end,
        reason,
        status: "PENDING",
      },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    await db.auditLog.create({
      data: {
        actorId: session.userId,
        action: "LEAVE_REQUEST",
        target: leave.id,
        details: JSON.stringify({ startDate, endDate, reason }),
        ipAddress: ip,
      },
    });

    return NextResponse.json({
      success: true,
      leave,
      message: "Solicitação de ausência enviada para análise da administração!",
    });
  } catch (error) {
    console.error("Erro ao solicitar ausência:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}

// APROVAR OU REJEITAR AUSÊNCIA (Liderança)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session || !hasPermission(session.role, PERMISSIONS.HR_MANAGE)) {
      return NextResponse.json({ error: "Apenas administradores podem avaliar ausências." }, { status: 403 });
    }

    const body = await req.json();
    const { leaveId, status, reviewNotes } = body;

    if (!leaveId || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    const updated = await db.leaveRequest.update({
      where: { id: leaveId },
      data: {
        status,
        reviewedById: session.userId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      },
      include: {
        user: { select: { username: true } },
      },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    await db.auditLog.create({
      data: {
        actorId: session.userId,
        action: status === "APPROVED" ? "LEAVE_APPROVE" : "LEAVE_REJECT",
        target: leaveId,
        details: JSON.stringify({ targetUser: updated.user.username, reviewNotes }),
        ipAddress: ip,
      },
    });

    return NextResponse.json({ success: true, leave: updated });
  } catch (error) {
    console.error("Erro ao revisar ausência:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}
