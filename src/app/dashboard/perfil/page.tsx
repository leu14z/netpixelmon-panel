import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { ProfileClient } from "./profile-client";

export default async function PerfilPage() {
  const session = await getAuthSession();
  if (!session) {
    redirect("/login");
  }

  return <ProfileClient session={session} />;
}
