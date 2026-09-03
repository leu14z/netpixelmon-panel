"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Video,
  ShieldAlert,
  History,
  LogOut,
  Radio,
  FileText,
  Bug,
} from "lucide-react";

interface DesktopSidebarProps {
  user: {
    id?: string;
    userId?: string;
    username: string;
    role: string;
    server: string;
  };
}

export function DesktopSidebar({ user }: DesktopSidebarProps) {
  const pathname = usePathname();

  const navSections = [
    {
      title: "GERAL",
      items: [
        { href: "/dashboard", label: "Visão Geral", icon: LayoutDashboard, exact: true },
      ],
    },
    {
      title: "STAFF & RH",
      items: [
        { href: "/dashboard/rh", label: "Equipe, Ponto & Ausências", icon: Users },
        { href: "/dashboard/anotacoes", label: "Anotações & Atas", icon: FileText },
      ],
    },
    {
      title: "SUPORTE & JOGADORES",
      items: [
        { href: "/dashboard/suporte", label: "Suporte com Tela (WebRTC)", icon: Radio },
        { href: "/dashboard/bugs", label: "Central de Bugs & Erros", icon: Bug },
        { href: "/dashboard/punicoes", label: "Registro de Punições", icon: ShieldAlert },
      ],
    },
    {
      title: "COMUNIDADE",
      items: [
        { href: "/dashboard/influenciadores", label: "Influenciadores & Cupons", icon: Video },
      ],
    },
    {
      title: "SEGURANÇA",
      items: [
        { href: "/dashboard/auditoria", label: "Logs de Auditoria", icon: History },
      ],
    },
  ];

  return (
    <aside className="w-60 bg-[#2B2D31] border-r border-[#202225] flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none">
      {/* Top Brand com Brasão do Mascote */}
      <div>
        <div className="h-14 flex items-center px-4 border-b border-[#202225] bg-[#2B2D31] gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1E1F22] p-1 flex items-center justify-center shrink-0 border border-[#383A40]">
            <Image
              src="/mascot.png"
              alt="NetPixelmon"
              width={26}
              height={26}
              className="object-contain"
              priority
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs tracking-tight text-[#F2F3F5] truncate">
              NetPixelmon
            </span>
            <span className="text-[10px] text-[#949BA4] font-medium">Painel da Staff</span>
          </div>
        </div>

        {/* Links de Navegação Agrupados Estilo Discord */}
        <div className="p-2.5 space-y-4 overflow-y-auto max-h-[calc(100vh-125px)]">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-0.5">
              <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-[#949BA4] block mb-1">
                {section.title}
              </span>
              {section.items.map((item: { href: string; label: string; icon: any; exact?: boolean }) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      isActive
                        ? "bg-[#35373C] text-[#F2F3F5]"
                        : "text-[#949BA4] hover:text-[#DBDEE1] hover:bg-[#313338]"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-[#5865F2]" : "text-[#949BA4]"}`} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer do Usuário Estilo Discord Voice / User Bar */}
      <div className="p-2 border-t border-[#202225] bg-[#232428]">
        <div className="flex items-center justify-between p-1.5 rounded-md hover:bg-[#2B2D31] transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user.username.substring(0, 2).toUpperCase()}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#23A55A] border-2 border-[#232428]" />
            </div>
            <div className="min-w-0 truncate">
              <div className="font-semibold text-xs text-[#F2F3F5] truncate leading-tight">
                {user.username}
              </div>
              <div className="text-[10px] text-[#949BA4] leading-tight">
                {user.role} • {user.server}
              </div>
            </div>
          </div>

          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="p-1.5 text-[#949BA4] hover:text-[#DA373C] hover:bg-[#DA373C]/10 rounded-md transition-colors"
              title="Sair da Conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
