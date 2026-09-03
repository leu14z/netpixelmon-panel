import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // 1. Verificar se o usuário atual possui um turno ativo
  const activeShift = await db.workShift.findFirst({
    where: {
      userId: session.userId,
      endedAt: null,
    },
    orderBy: { startedAt: "desc" },
  });

  // 2. Buscar TODOS os staffs que estão com o turno aberto AGORA (Staff On-Duty)
  const onDutyStaff = await db.workShift.findMany({
    where: { endedAt: null },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          role: true,
          server: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  // 3. Buscar horas cumpridas na semana pelo usuário
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const myWeeklyShifts = await db.workShift.findMany({
    where: {
      userId: session.userId,
      startedAt: { gte: startOfWeek },
      endedAt: { not: null },
    },
    orderBy: { startedAt: "desc" },
  });

  const totalMinutesThisWeek = myWeeklyShifts.reduce(
    (acc, shift) => acc + (shift.durationMinutes || 0),
    0
  );

  // 4. Últimos turnos da equipe para o feed de registros
  const recentTeamShifts = await db.workShift.findMany({
    take: 15,
    orderBy: { startedAt: "desc" },
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
  });

  return NextResponse.json({
    activeShift,
    onDutyStaff,
    activeStaffCount: onDutyStaff.length,
    totalMinutesThisWeek,
    myWeeklyShifts,
    recentTeamShifts,
  });
}

// INICIAR OU FINALIZAR TURNO DE PONTO
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, notes, server } = body;

    const existingActive = await db.workShift.findFirst({
      where: {
        userId: session.userId,
        endedAt: null,
      },
    });

    if (action === "START") {
      if (existingActive) {
        // Já tem turno aberto, retorna o existente sem falhar
        return NextResponse.json({
          success: true,
          message: "Turno já estava ativo!",
          shift: existingActive,
        });
      }

      const newShift = await db.workShift.create({
        data: {
          userId: session.userId,
          server: server || session.server || "GLOBAL",
          notes: notes || null,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Turno iniciado com sucesso! Bom plantão.",
        shift: newShift,
      });
    } else if (action === "STOP") {
      if (!existingActive) {
        return NextResponse.json(
          { error: "Nenhum turno em andamento para encerrar." },
          { status: 400 }
        );
      }

      const now = new Date();
      const diffMs = now.getTime() - existingActive.startedAt.getTime();
      const durationMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));

      const finalizedShift = await db.workShift.update({
        where: { id: existingActive.id },
        data: {
          endedAt: now,
          durationMinutes,
          notes: notes || existingActive.notes,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Turno finalizado! Duração: ${durationMinutes} minutos.`,
        shift: finalizedShift,
      });
    }

    return NextResponse.json({ error: "Ação inválida (use START ou STOP)." }, { status: 400 });
  } catch (error) {
    console.error("Erro no registro de ponto:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}
