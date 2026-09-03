import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { BugsClient } from "./bugs-client";

export default async function BugsPage() {
  const session = await getAuthSession();
  if (!session) {
    redirect("/login");
  }

  return <BugsClient userRole={session.role} />;
}
