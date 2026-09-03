import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { RhDashboardClient } from "./rh-client";

export default async function RhPage() {
  const session = await getAuthSession();
  if (!session) {
    redirect("/login");
  }

  return <RhDashboardClient currentUser={session} />;
}
