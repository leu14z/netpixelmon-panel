import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { DesktopSidebar } from "@/components/desktop-sidebar";
import { DesktopHeader } from "@/components/desktop-header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-[#1E1F22] text-[#DBDEE1] overflow-hidden font-sans">
      {/* Sidebar Lateral Esquerda */}
      <DesktopSidebar user={session} />

      {/* Área Central */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DesktopHeader user={session} />
        <main className="flex-1 overflow-y-auto p-6 bg-[#1E1F22]">
          <div className="max-w-[1380px] mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
