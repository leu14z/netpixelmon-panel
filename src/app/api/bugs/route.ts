import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

const bugSchema = z.object({
  title: z.string().min(3, "Título é obrigatório"),
  description: z.string().min(5, "Descrição do bug é obrigatória"),
  category: z.enum(["LAUNCHER", "BATALHA", "DUPE_ECONOMIA", "CRASH", "OUTRO"]).default("OUTRO"),
  server: z.enum(["CYAN", "ORANGE", "GLOBAL"]).default("GLOBAL"),
  priority: z.enum(["BAIXA", "MEDIA", "CRITICA"]).default("MEDIA"),
  reporterNick: z.string().optional(),
  proofUrl: z.string().url("Link inválido").optional().or(z.literal("")),
});

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const server = searchParams.get("server");

  const bugs = await db.bugReport.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(server && server !== "GLOBAL" ? { server } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ bugs });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = bugSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Dados inválidos", details: parseResult.error.flatten() }, { status: 400 });
    }

    const { title, description, category, server, priority, reporterNick, proofUrl } = parseResult.data;

    const bug = await db.bugReport.create({
      data: {
        title,
        description,
        category,
        server,
        priority,
        reporterNick: reporterNick || null,
        proofUrl: proofUrl || null,
        createdById: session.userId,
      },
    });

    return NextResponse.json({ success: true, bug });
  } catch (error) {
    console.error("Erro ao registrar bug:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, priority } = body;

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório." }, { status: 400 });
    }

    const updated = await db.bugReport.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
      },
    });

    return NextResponse.json({ success: true, bug: updated });
  } catch (error) {
    console.error("Erro ao atualizar bug:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório." }, { status: 400 });
    }

    await db.bugReport.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Bug removido com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir bug:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}
