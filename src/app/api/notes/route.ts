import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";

const noteSchema = z.object({
  title: z.string().min(2, "Título é obrigatório"),
  content: z.string().min(5, "Conteúdo é obrigatório"),
  category: z.enum(["REGULAMENTO", "ATA_REUNIAO", "AVISO", "GERAL"]).default("GERAL"),
  pinned: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const notes = await db.staffNote.findMany({
    where: category ? { category } : {},
    orderBy: [
      { pinned: "desc" },
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = noteSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Dados inválidos", details: parseResult.error.flatten() }, { status: 400 });
    }

    const { title, content, category, pinned } = parseResult.data;

    const note = await db.staffNote.create({
      data: {
        title,
        content,
        category,
        pinned,
        authorId: session.userId,
        authorName: session.username,
      },
    });

    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error("Erro ao salvar anotação:", error);
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

    const note = await db.staffNote.findUnique({ where: { id } });
    if (!note) {
      return NextResponse.json({ error: "Nota não encontrada." }, { status: 404 });
    }

    // Apenas o autor ou líderes (OWNER/ADMIN) podem excluir
    const isLeader = session.role === "OWNER" || session.role === "ADMIN";
    if (note.authorId !== session.userId && !isLeader) {
      return NextResponse.json({ error: "Você só pode excluir suas próprias notas." }, { status: 403 });
    }

    await db.staffNote.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Anotação excluída." });
  } catch (error) {
    console.error("Erro ao excluir anotação:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}
