import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const signalSchema = z.object({
  roomCode: z.string().min(3),
  senderType: z.enum(["STAFF", "PLAYER"]),
  signalType: z.enum(["offer", "answer", "candidate", "stop", "heartbeat"]),
  payload: z.string().default(""),
  nick: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const forType = searchParams.get("forType"); // Quem está buscando (STAFF quer sinais de PLAYER e vice-versa)
  const after = searchParams.get("after");

  if (!code) {
    return NextResponse.json({ error: "Código da sala é obrigatório." }, { status: 400 });
  }

  // Busca os sinais enviados pelo OUTRO participante
  const signals = await db.supportSignal.findMany({
    where: {
      roomCode: code,
      ...(forType ? { senderType: forType === "STAFF" ? "PLAYER" : "STAFF" } : {}),
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  // Busca presença dos últimos 10 segundos
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

    const { roomCode, senderType, signalType, payload, nick } = parseResult.data;

    // Se for sinal de heartbeat, apenas atualiza a presença
    if (signalType === "heartbeat") {
      await db.supportPresence.upsert({
        where: {
          roomCode_clientType: {
            roomCode,
            clientType: senderType,
          },
        },
        update: {
          lastSeenAt: new Date(),
          ...(nick ? { nick } : {}),
        },
        create: {
          roomCode,
          clientType: senderType,
          nick: nick || senderType,
          lastSeenAt: new Date(),
        },
      });

      return NextResponse.json({ success: true });
    }

    // Se for sinal de WebRTC (offer, answer, candidate, stop)
    // Se for 'stop', limpa ofertas anteriores para resetar
    if (signalType === "stop") {
      await db.supportSignal.deleteMany({
        where: { roomCode },
      });
    }

    const signal = await db.supportSignal.create({
      data: {
        roomCode,
        senderType,
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
