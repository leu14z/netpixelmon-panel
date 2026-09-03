import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthSession, hasPermission, PERMISSIONS } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

const punishSchema = z.object({
  playerUuid: z.string().min(1, "UUID do jogador é obrigatório"),
  playerName: z.string().min(2, "Nome do jogador é obrigatório"),
  type: z.enum(["BAN", "MUTE", "KICK", "WARN"]),
  reason: z.string().min(5, "Motivo deve ter pelo menos 5 caracteres"),
  proofUrl: z.string().url("URL de prova inválida").optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    // 1. CHECAGEM DE AUTENTICAÇÃO E SESSÃO SERVER-SIDE
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json(
        { error: "Sessão não encontrada ou expirada. Faça login novamente." },
        { status: 401 }
      );
    }

    // 2. CHECAGEM DE PERMISSÃO E RBAC (Apenas MODERATOR, ADMIN e OWNER podem aplicar punição)
    if (!hasPermission(session.role, PERMISSIONS.PUNISH_CREATE)) {
      return NextResponse.json(
        { error: "Você não possui permissão para aplicar punições." },
        { status: 403 }
      );
    }

    // 3. RATE LIMITING POR USUÁRIO (Máximo 10 punições por minuto)
    const rateLimit = await checkRateLimit(session.userId, "punish_create", 10, 60);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Você está criando punições rápido demais. Aguarde alguns segundos." },
        { status: 429 }
      );
    }

    // 4. PARSE E VALIDAÇÃO DOS DADOS ENVIADOS
    const body = await req.json();
    const parseResult = punishSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { playerUuid, playerName, type, reason, proofUrl } = parseResult.data;

    // 5. REGISTRAR PUNIÇÃO NO BANCO DE DADOS
    const punishment = await db.punishment.create({
      data: {
        staffId: session.userId,
        playerUuid,
        playerName,
        type,
        reason,
        proofUrl: proofUrl || null,
      },
    });

    // 6. REGISTRAR LOG DE AUDITORIA IMUTÁVEL
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    await db.auditLog.create({
      data: {
        actorId: session.userId,
        action: "PUNISHMENT_CREATE",
        target: playerUuid,
        details: JSON.stringify({
          playerName,
          type,
          reason,
          punishmentId: punishment.id,
        }),
        ipAddress: ip,
      },
    });

    return NextResponse.json({
      success: true,
      punishment,
    });
  } catch (error) {
    console.error("Erro ao registrar punição:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
