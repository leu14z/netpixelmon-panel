import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { SupportDashboardClient } from "./support-client";

export default async function SupportPage() {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login");
  }

  return <SupportDashboardClient currentUser={session} />;
}
