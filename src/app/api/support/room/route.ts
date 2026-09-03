import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

const createRoomSchema = z.object({
  playerNick: z.string().min(2, "Nick do jogador é obrigatório"),
  category: z.enum(["LAUNCHER_ERROR", "CRASH_LOGS", "MODS_PIXELMON", "OTHER"]).default("LAUNCHER_ERROR"),
  notes: z.string().optional(),
});

// LISTAR OU BUSCAR SALA
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (code) {
    const room = await db.supportRoom.findUnique({
      where: { code },
      include: {
        staff: {
          select: {
            username: true,
            role: true,
            server: true,
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Sala não encontrada ou código expirado." }, { status: 404 });
    }

    return NextResponse.json({ room });
  }

  // Se não passou código, lista as salas (apenas para staff autenticado)
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const rooms = await db.supportRoom.findMany({
    take: 20,
    orderBy: { startedAt: "desc" },
    include: {
      staff: {
        select: {
          username: true,
          role: true,
        },
      },
    },
  });

  return NextResponse.json({ rooms });
}

// CRIAR SALA DE SUPORTE COM TRANSMISSÃO
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = createRoomSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { playerNick, category, notes } = parseResult.data;

    // Gerar código amigável: px-1234
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = `px-${randomSuffix}`;

    const room = await db.supportRoom.create({
      data: {
        code,
        staffId: session.userId,
        playerNick,
        category,
        notes: notes || null,
        status: "ACTIVE",
      },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    await db.auditLog.create({
      data: {
        actorId: session.userId,
        action: "SUPPORT_ROOM_CREATE",
        target: room.id,
        details: JSON.stringify({ code, playerNick, category }),
        ipAddress: ip,
      },
    });

    return NextResponse.json({
      success: true,
      room,
      shareUrl: `/suporte/sala/${code}`,
    });
  } catch (error) {
    console.error("Erro ao criar sala de suporte:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}

// ENCERRAR SALA DE SUPORTE
export async function PATCH(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { code, notes } = body;

    if (!code) {
      return NextResponse.json({ error: "Código da sala é obrigatório." }, { status: 400 });
    }

    const room = await db.supportRoom.findUnique({ where: { code } });
    if (!room) {
      return NextResponse.json({ error: "Sala não encontrada." }, { status: 404 });
    }

    const updated = await db.supportRoom.update({
      where: { code },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        notes: notes || room.notes,
      },
    });

    return NextResponse.json({ success: true, room: updated });
  } catch (error) {
    console.error("Erro ao encerrar sala:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}
