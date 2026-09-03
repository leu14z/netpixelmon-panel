import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME } from "./lib/auth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "e9a8f237841c0b395d3e218764129b01f928a514d3c69e2a87b12095f43210ab"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // 1. CABEÇALHOS DE SEGURANÇA (Security Headers)
  response.headers.set("X-Frame-Options", "DENY"); // Previne Clickjacking
  response.headers.set("X-Content-Type-Options", "nosniff"); // Previne MIME sniffing
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // 2. PROTEÇÃO DE ROTAS DO PAINEL (Server-side Auth Guard)
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isStaffApiRoute = pathname.startsWith("/api/staff");

  if (isDashboardRoute || isStaffApiRoute) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      if (isStaffApiRoute) {
        return NextResponse.json(
          { error: "Não autorizado. Sessão não encontrada." },
          { status: 401 }
        );
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Valida o JWT da sessão no Edge Middleware
      await jwtVerify(token, JWT_SECRET);
    } catch {
      // Token inválido ou adulterado
      if (isStaffApiRoute) {
        return NextResponse.json(
          { error: "Sessão inválida ou expirada." },
          { status: 401 }
        );
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }
  }

  // Se já estiver logado e tentar acessar /login, redireciona para /dashboard
  if (pathname === "/login") {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      try {
        await jwtVerify(token, JWT_SECRET);
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } catch {
        // Se o token for inválido, limpa e deixa ir para a página de login
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/staff/:path*",
    "/login",
  ],
};
