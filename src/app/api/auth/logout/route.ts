import { NextResponse } from "next/server";
import { destroyAuthSession } from "@/lib/auth";

export async function POST() {
  await destroyAuthSession();
  return NextResponse.json({ success: true, message: "Deslogado com sucesso." });
}
