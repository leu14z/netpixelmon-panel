import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/crypto";
import { createAuthSession, Role } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";

const loginSchema = z.object({
  username: z.string().min(3, "Nome de usuário muito curto"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  turnstileToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Unknown Browser";

    // 1. RATE LIMITING (Máximo 5 tentativas por IP a cada 15 minutos)
    const rateLimit = await checkRateLimit(ip, "login", 5, 900);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: `Muitas tentativas incorretas. Tente novamente em ${rateLimit.resetInSeconds} segundos.`,
        },
        { status: 429 }
      );
    }

    // 2. PARSE E VALIDAÇÃO DOS CAMPOS
    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { username, password, turnstileToken } = parseResult.data;

    // 3. PROTEÇÃO CONTRA BOTS (Cloudflare Turnstile)
    if (turnstileToken) {
      const isHuman = await verifyTurnstileToken(turnstileToken, ip);
      if (!isHuman) {
        return NextResponse.json(
          { error: "Verificação de segurança anti-bot falhou. Tente novamente." },
          { status: 400 }
        );
      }
    }

    // 4. SEED DE CONTA DEFAULT (Para facilidade de teste local)
    let user = await db.user.findUnique({
      where: { username },
    });

    if (!user && (await db.user.count()) === 0) {
      // Cria conta master padrão se o banco estiver completamente vazio
      const defaultPasswordHash = await hashPassword("Admin123!");
      user = await db.user.create({
        data: {
          username: "OwnerNetPixelmon",
          email: "owner@netpixelmon.com",
          passwordHash: defaultPasswordHash,
          role: "OWNER",
        },
      });
    }

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Usuário ou senha incorretos." },
        { status: 401 }
      );
    }

    // 5. VALIDAÇÃO DE SENHA COM ARGON2ID
    const isPasswordValid = await verifyPassword(user.passwordHash, password);
    if (!isPasswordValid) {
      // Registrar log de auditoria de tentativa falha
      await db.auditLog.create({
        data: {
          actorId: user.id,
          action: "LOGIN_FAILED",
          details: JSON.stringify({ reason: "Senha incorreta" }),
          ipAddress: ip,
        },
      }).catch(() => {});

      return NextResponse.json(
        { error: "Usuário ou senha incorretos." },
        { status: 401 }
      );
    }

    // 6. CRIAR SESSÃO SERVER-SIDE & EMITIR COOKIE HTTPONLY
    await createAuthSession(
      user.id,
      user.role as Role,
      user.username,
      user.server || "GLOBAL",
      ip,
      userAgent
    );

    // 7. REGISTRAR LOG DE AUDITORIA DE SUCESSO
    await db.auditLog.create({
      data: {
        actorId: user.id,
        action: "LOGIN_SUCCESS",
        details: JSON.stringify({ role: user.role, server: user.server }),
        ipAddress: ip,
      },
    });

    // Retorna apenas dados públicos seguros (sem passwordHash ou secrets)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        server: user.server || "GLOBAL",
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error("Erro interno no login:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao autenticar." },
      { status: 500 }
    );
  }
}
