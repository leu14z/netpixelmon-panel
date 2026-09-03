import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { hashPassword } from "@/lib/crypto";

const createStaffSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter no mínimo 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  role: z.enum(["ADMIN", "MODERATOR", "HELPER"]),
  server: z.enum(["CYAN", "ORANGE", "GLOBAL"]).default("GLOBAL"),
});

// LISTAR MEMBROS DA STAFF
export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const members = await db.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      server: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          workShifts: true,
          warningsReceived: true,
          leaveRequests: true,
          punishments: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ members });
}

// CRIAR NOVO ACESSO DE STAFF (Exclusivo Dono / Admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session || !hasPermission(session.role, PERMISSIONS.STAFF_MANAGE)) {
      return NextResponse.json(
        { error: "Apenas administradores e o dono podem cadastrar novos membros da staff." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parseResult = createStaffSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { username, email, password, role, server } = parseResult.data;

    // Verificar se usuário ou email já existem
    const existing = await db.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Já existe um usuário com esse username ou e-mail." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newStaff = await db.user.create({
      data: {
        username,
        email,
        passwordHash,
        role,
        server,
        mustChangePassword: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        server: true,
        createdAt: true,
      },
    });

    // Auditoria
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    await db.auditLog.create({
      data: {
        actorId: session.userId,
        action: "STAFF_CREATE",
        target: newStaff.id,
        details: JSON.stringify({ username, role, server }),
        ipAddress: ip,
      },
    });

    return NextResponse.json({
      success: true,
      member: newStaff,
      message: `Membro ${username} cadastrado com sucesso no cargo ${role}!`,
    });
  } catch (error) {
    console.error("Erro ao criar membro da staff:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}

// ATUALIZAR STATUS, CARGO OU REDEFINIR SENHA DO MEMBRO
export async function PATCH(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session || !hasPermission(session.role, PERMISSIONS.STAFF_MANAGE)) {
      return NextResponse.json({ error: "Sem permissão para alterar membros." }, { status: 403 });
    }

    const body = await req.json();
    const { userId, role, isActive, server, newPassword } = body;

    if (!userId) {
      return NextResponse.json({ error: "ID do usuário é obrigatório." }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    // Não permitir que outro admin altere o OWNER
    if (targetUser.role === "OWNER" && session.role !== "OWNER") {
      return NextResponse.json({ error: "Não é permitido alterar a conta do Dono." }, { status: 403 });
    }

    let passwordHashUpdate = undefined;
    if (newPassword && newPassword.length >= 6) {
      passwordHashUpdate = await hashPassword(newPassword);
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: {
        ...(role ? { role } : {}),
        ...(typeof isActive === "boolean" ? { isActive } : {}),
        ...(server ? { server } : {}),
        ...(passwordHashUpdate ? { passwordHash: passwordHashUpdate } : {}),
      },
      select: {
        id: true,
        username: true,
        role: true,
        server: true,
        isActive: true,
      },
    });

    // Se a conta for desativada ou a senha for alterada, derrubar as sessões
    if (isActive === false || passwordHashUpdate) {
      await db.session.deleteMany({ where: { userId } });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    await db.auditLog.create({
      data: {
        actorId: session.userId,
        action: "STAFF_UPDATE",
        target: userId,
        details: JSON.stringify({ changes: { role, isActive, server, resetPassword: !!newPassword } }),
        ipAddress: ip,
      },
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (error) {
    console.error("Erro ao atualizar membro:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}

// EXCLUIR DEFINITIVAMENTE O ACESSO DE UM MEMBRO (Revogação Permanente)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session || !hasPermission(session.role, PERMISSIONS.STAFF_MANAGE)) {
      return NextResponse.json({ error: "Sem permissão para remover membros." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "ID do usuário é obrigatório." }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 });
    }

    if (targetUser.role === "OWNER") {
      return NextResponse.json({ error: "A conta do Dono não pode ser excluída." }, { status: 403 });
    }

    if (targetUser.id === session.userId) {
      return NextResponse.json({ error: "Você não pode excluir sua própria conta aqui." }, { status: 400 });
    }

    // 1. Derrubar todas as sessões ativas
    await db.session.deleteMany({ where: { userId } });

    // 2. Excluir o usuário permanentemente
    await db.user.delete({ where: { id: userId } });

    // 3. Registrar no log de auditoria
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    await db.auditLog.create({
      data: {
        actorId: session.userId,
        action: "STAFF_DELETE",
        target: userId,
        details: JSON.stringify({ deletedUsername: targetUser.username, role: targetUser.role }),
        ipAddress: ip,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Acesso do membro ${targetUser.username} foi revogado e excluído com sucesso.`,
    });
  } catch (error) {
    console.error("Erro ao excluir membro:", error);
    return NextResponse.json({ error: "Erro interno no servidor ao remover membro." }, { status: 500 });
  }
}
