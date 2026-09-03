import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const signalSchema = z.object({
  roomCode: z.string().min(3),
  senderId: z.string().min(1), // PeerId único da aba/dispositivo
  senderRole: z.enum(["STAFF", "PLAYER"]).default("PLAYER"),
  signalType: z.enum(["offer", "answer", "candidate", "stop", "heartbeat", "room_closed"]),
  payload: z.string().default(""),
  nick: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const peerId = searchParams.get("peerId"); // Meu ID único
  const after = searchParams.get("after");

  if (!code) {
    return NextResponse.json({ error: "Código da sala é obrigatório." }, { status: 400 });
  }

  // 1. Verifica se a sala foi encerrada no Banco de Dados
  const room = await db.supportRoom.findUnique({
    where: { code },
    select: { status: true, closedAt: true },
  });

  const isClosed = !room || room.status === "CLOSED";

  // 2. Busca sinais enviados por OUTROS peers (excluindo os meus)
  const signals = await db.supportSignal.findMany({
    where: {
      roomCode: code,
      ...(peerId ? { senderType: { not: peerId } } : {}),
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  // 3. Busca presença dos últimos 10 segundos
  const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
  const presences = await db.supportPresence.findMany({
    where: {
      roomCode: code,
      lastSeenAt: { gte: tenSecondsAgo },
    },
  });

  const staffOnline = presences.some((p) => p.clientType === "STAFF");
  const playerOnline = presences.some((p) => p.clientType === "PLAYER");
  const staffNick = presences.find((p) => p.clientType === "STAFF")?.nick || null;
  const playerNick = presences.find((p) => p.clientType === "PLAYER")?.nick || null;

  return NextResponse.json({
    roomClosed: isClosed,
    signals,
    presence: {
      staffOnline,
      playerOnline,
      staffNick,
      playerNick,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = signalSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const { roomCode, senderId, senderRole, signalType, payload, nick } = parseResult.data;

    // Se for sinal de heartbeat, atualiza a presença do cliente
    if (signalType === "heartbeat") {
      await db.supportPresence.upsert({
        where: {
          roomCode_clientType: {
            roomCode,
            clientType: senderRole,
          },
        },
        update: {
          lastSeenAt: new Date(),
          ...(nick ? { nick } : {}),
        },
        create: {
          roomCode,
          clientType: senderRole,
          nick: nick || senderRole,
          lastSeenAt: new Date(),
        },
      });

      return NextResponse.json({ success: true });
    }

    // Se a sala for encerrada
    if (signalType === "room_closed") {
      await db.supportRoom.updateMany({
        where: { code: roomCode },
        data: { status: "CLOSED", closedAt: new Date() },
      });
    }

    // Se for sinal de parada ou nova oferta, remove sinais antigos de 'offer' para não misturar
    if (signalType === "stop" || signalType === "offer") {
      await db.supportSignal.deleteMany({
        where: {
          roomCode,
          signalType: { in: ["offer", "answer", "candidate"] },
        },
      });
    }

    const signal = await db.supportSignal.create({
      data: {
        roomCode,
        senderType: senderId, // Armazena o PeerId único do remetente
        signalType,
        payload,
      },
    });

    return NextResponse.json({ success: true, signal });
  } catch (error) {
    console.error("Erro ao processar sinal de suporte:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}
