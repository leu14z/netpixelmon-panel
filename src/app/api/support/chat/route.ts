import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const chatSchema = z.object({
  roomCode: z.string().min(3),
  senderName: z.string().min(1),
  isStaff: z.boolean().default(false),
  text: z.string().min(1).max(1000),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const after = searchParams.get("after");

  if (!code) {
    return NextResponse.json({ error: "Código da sala é obrigatório." }, { status: 400 });
  }

  const messages = await db.supportMessage.findMany({
    where: {
      roomCode: code,
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = chatSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const { roomCode, senderName, isStaff, text } = parseResult.data;

    const message = await db.supportMessage.create({
      data: {
        roomCode,
        senderName,
        isStaff,
        text,
      },
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Erro ao salvar mensagem de suporte:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
