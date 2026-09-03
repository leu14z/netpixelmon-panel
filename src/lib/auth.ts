import { cookies } from "next/headers";
import { db } from "./db";
import { env } from "./env";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "netpixelmon_session";
const JWT_SECRET = new TextEncoder().encode(env.SESSION_SECRET);

export type Role = "OWNER" | "ADMIN" | "MODERATOR" | "HELPER";

export interface AuthSessionPayload {
  sessionId: string;
  userId: string;
  role: Role;
  username: string;
  server: string;
}

// MATRIZ DE PERMISSÕES RBAC (Hierarquia de Cargos)
// OWNER > ADMIN > MODERATOR > HELPER
export const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 4,
  ADMIN: 3,
  MODERATOR: 2,
  HELPER: 1,
};

export const PERMISSIONS = {
  // Ações de Punição
  PUNISH_CREATE: ["OWNER", "ADMIN", "MODERATOR"] as Role[],
  PUNISH_DELETE: ["OWNER", "ADMIN"] as Role[],
  
  // Ações de RH & Staff
  STAFF_MANAGE: ["OWNER", "ADMIN"] as Role[],
  HR_MANAGE: ["OWNER", "ADMIN"] as Role[],
  HR_VIEW: ["OWNER", "ADMIN", "MODERATOR", "HELPER"] as Role[],
  SUPPORT_SCREEN_SHARE: ["OWNER", "ADMIN", "MODERATOR", "HELPER"] as Role[],

  // Ações de Sistema e Logs
  SYSTEM_CONFIG: ["OWNER"] as Role[],
  LOGS_VIEW: ["OWNER", "ADMIN", "MODERATOR", "HELPER"] as Role[],
  LOGS_SENSITIVE: ["OWNER", "ADMIN"] as Role[],
};

/**
 * CRIAR SESSÃO SERVER-SIDE E COOKIE SEGURO
 */
export async function createAuthSession(
  userId: string,
  role: Role,
  username: string,
  server: string,
  ipAddress: string,
  userAgent: string
) {
  // 1. Criar registro de sessão no Banco de Dados
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
  const sessionToken = crypto.randomUUID();

  const dbSession = await db.session.create({
    data: {
      userId,
      token: sessionToken,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  // 2. Assinar JWT contendo sessionId
  const jwt = await new SignJWT({
    sessionId: dbSession.id,
    userId,
    role,
    username,
    server,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  // 3. Definir Cookie Seguro (HttpOnly, Secure, SameSite=Lax)
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, jwt, {
    httpOnly: true,                                // Protege contra XSS (JS não lê)
    secure: process.env.NODE_ENV === "production",  // Transmitido apenas em HTTPS
    sameSite: "lax",                               // Protege contra CSRF
    expires: expiresAt,
    path: "/",
  });

  return dbSession;
}

/**
 * VERIFICAR SESSÃO SERVER-SIDE (Auth Server Side)
 */
export async function getAuthSession(): Promise<AuthSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) return null;

    // 1. Valida integridade do JWT
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const authData = payload as unknown as AuthSessionPayload;

    // 2. Valida se a sessão ainda existe no Banco de Dados e não expirou
    const dbSession = await db.session.findUnique({
      where: { id: authData.sessionId },
      include: { user: true },
    });

    if (!dbSession || dbSession.expiresAt < new Date() || !dbSession.user.isActive) {
      return null;
    }

    return {
      sessionId: dbSession.id,
      userId: dbSession.user.id,
      role: dbSession.user.role as Role,
      username: dbSession.user.username,
      server: dbSession.user.server || "GLOBAL",
    };
  } catch {
    return null;
  }
}

/**
 * REVOGAR SESSÃO E LIMPAR COOKIE
 */
export async function destroyAuthSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const sessionId = (payload as { sessionId?: string }).sessionId;
      if (sessionId) {
        await db.session.delete({ where: { id: sessionId } }).catch(() => {});
      }
    } catch {}
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * CHECAGEM DE HIERARQUIA E PERMISSÕES (RBAC)
 */
export function hasRequiredRole(userRole: Role, minRequiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRequiredRole];
}

export function hasPermission(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole);
}
