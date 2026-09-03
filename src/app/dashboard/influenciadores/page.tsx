import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { InfluencersClient } from "./influencer-client";

export default async function InfluenciadoresPage() {
  const session = await getAuthSession();
  if (!session) {
    redirect("/login");
  }

  return <InfluencersClient userRole={session.role} />;
}
