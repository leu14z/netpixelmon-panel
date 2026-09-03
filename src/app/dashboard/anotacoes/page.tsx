import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { NotesClient } from "./notes-client";

export default async function AnotacoesPage() {
  const session = await getAuthSession();
  if (!session) {
    redirect("/login");
  }

  return <NotesClient userRole={session.role} username={session.username} />;
}
