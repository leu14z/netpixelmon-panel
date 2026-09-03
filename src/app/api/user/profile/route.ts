import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { verifyPassword, hashPassword } from "@/lib/crypto";

const profileSchema = z.object({
  avatarUrl: z.string().url("Link de imagem inválido").optional().or(z.literal("")),
  discordId: z.string().max(50).optional().or(z.literal("")),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres").optional(),
});

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      server: true,
      avatarUrl: true,
      discordId: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = profileSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { avatarUrl, discordId, currentPassword, newPassword } = parseResult.data;

    // Se estiver alterando a senha, valida a senha atual
    let updatedPasswordHash: string | undefined = undefined;

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Para alterar a senha, você deve informar a senha atual." },
          { status: 400 }
        );
      }

      const currentUser = await db.user.findUnique({
        where: { id: session.userId },
      });

      if (!currentUser) {
        return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
      }

      const isCurrentValid = await verifyPassword(currentUser.passwordHash, currentPassword);
      if (!isCurrentValid) {
        return NextResponse.json({ error: "A senha atual informada está incorreta." }, { status: 400 });
      }

      updatedPasswordHash = await hashPassword(newPassword);
    }

    const updatedUser = await db.user.update({
      where: { id: session.userId },
      data: {
        ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
        ...(discordId !== undefined ? { discordId: discordId || null } : {}),
        ...(updatedPasswordHash ? { passwordHash: updatedPasswordHash } : {}),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        server: true,
        avatarUrl: true,
        discordId: true,
      },
    });

    // Registra log de auditoria
    await db.auditLog.create({
      data: {
        actorId: session.userId,
        action: "PROFILE_UPDATE",
        target: session.userId,
        details: JSON.stringify({
          changedAvatar: avatarUrl !== undefined,
          changedPassword: !!newPassword,
          changedDiscord: discordId !== undefined,
        }),
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1",
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}
