import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthSession, hasPermission, PERMISSIONS } from "@/lib/auth";

const influencerSchema = z.object({
  name: z.string().min(2, "Nome do influenciador é obrigatório"),
  channelUrl: z.string().url("Link do canal inválido"),
  platform: z.enum(["YOUTUBE", "TWITCH", "TIKTOK", "KICK"]),
  couponCode: z.string().min(2, "Código do cupom é obrigatório").toUpperCase(),
  subscribersCount: z.number().int().nonnegative().default(0),
  status: z.enum(["ACTIVE", "IN_TEST", "PAUSED"]).default("ACTIVE"),
  monthlyReward: z.string().optional(),
  notes: z.string().optional(),
});

const contentIdeaSchema = z.object({
  title: z.string().min(3, "Título da pauta é obrigatório"),
  description: z.string().min(5, "Descrição é obrigatória"),
  targetServer: z.enum(["CYAN", "ORANGE", "GLOBAL"]).default("GLOBAL"),
  status: z.enum(["SUGGESTED", "RECORDING", "PUBLISHED"]).default("SUGGESTED"),
});

// LISTAR INFLUENCIADORES E PAUTAS
export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const [influencers, ideas] = await Promise.all([
    db.influencer.findMany({
      orderBy: { createdAt: "desc" },
    }),
    db.contentIdea.findMany({
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ influencers, ideas });
}

// CRIAR INFLUENCIADOR OU PAUTA
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session || !hasPermission(session.role, PERMISSIONS.STAFF_MANAGE)) {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }

    const body = await req.json();
    const { type } = body; // "INFLUENCER" ou "IDEA"

    if (type === "IDEA") {
      const parseResult = contentIdeaSchema.safeParse(body.data);
      if (!parseResult.success) {
        return NextResponse.json({ error: "Dados inválidos", details: parseResult.error.flatten() }, { status: 400 });
      }

      const idea = await db.contentIdea.create({
        data: parseResult.data,
      });

      return NextResponse.json({ success: true, idea });
    }

    // Criar influenciador
    const parseResult = influencerSchema.safeParse(body.data || body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Dados inválidos", details: parseResult.error.flatten() }, { status: 400 });
    }

    const { name, channelUrl, platform, couponCode, subscribersCount, status, monthlyReward, notes } = parseResult.data;

    // Verificar se cupom já existe
    const existingCoupon = await db.influencer.findUnique({
      where: { couponCode },
    });
    if (existingCoupon) {
      return NextResponse.json({ error: `O cupom ${couponCode} já está em uso pelo parceiro ${existingCoupon.name}.` }, { status: 409 });
    }

    const influencer = await db.influencer.create({
      data: {
        name,
        channelUrl,
        platform,
        couponCode,
        subscribersCount,
        status,
        monthlyReward: monthlyReward || null,
        notes: notes || null,
      },
    });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    await db.auditLog.create({
      data: {
        actorId: session.userId,
        action: "INFLUENCER_CREATE",
        target: influencer.id,
        details: JSON.stringify({ name, couponCode, platform }),
        ipAddress: ip,
      },
    });

    return NextResponse.json({ success: true, influencer });
  } catch (error) {
    console.error("Erro ao criar influenciador/pauta:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}

// ATUALIZAR STATUS DE INFLUENCIADOR OU PAUTA
export async function PATCH(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session || !hasPermission(session.role, PERMISSIONS.STAFF_MANAGE)) {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }

    const body = await req.json();
    const { id, type, status, monthlyReward, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório." }, { status: 400 });
    }

    if (type === "IDEA") {
      const updated = await db.contentIdea.update({
        where: { id },
        data: { status },
      });
      return NextResponse.json({ success: true, idea: updated });
    }

    const updated = await db.influencer.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(monthlyReward ? { monthlyReward } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });

    return NextResponse.json({ success: true, influencer: updated });
  } catch (error) {
    console.error("Erro ao atualizar:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}

// EXCLUIR INFLUENCIADOR OU PAUTA
export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session || !hasPermission(session.role, PERMISSIONS.STAFF_MANAGE)) {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type"); // "INFLUENCER" ou "IDEA"

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório." }, { status: 400 });
    }

    if (type === "IDEA") {
      await db.contentIdea.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Pauta excluída com sucesso." });
    }

    await db.influencer.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Influenciador removido com sucesso." });
  } catch (error) {
    console.error("Erro ao remover:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}
