import { NextRequest, NextResponse } from "next/server";
import { destroyAuthSession, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await destroyAuthSession();

  const loginUrl = new URL("/login", req.url);
  const response = NextResponse.redirect(loginUrl, { status: 303 });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

export async function GET(req: NextRequest) {
  await destroyAuthSession();

  const loginUrl = new URL("/login", req.url);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
