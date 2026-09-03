"use client";

import { useState, useEffect } from "react";
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
  Settings,
  X,
} from "lucide-react";

interface DesktopSidebarProps {
  user: {
    id?: string;
    userId?: string;
    username: string;
    role: string;
    server: string;
    avatarUrl?: string | null;
  };
}

export function DesktopSidebar({ user }: DesktopSidebarProps) {
  const pathname = usePathname();
  const [avatar, setAvatar] = useState<string | null>(user.avatarUrl || null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (user.avatarUrl) setAvatar(user.avatarUrl);

    const handleUserUpdated = (e: any) => {
      if (e.detail?.avatarUrl !== undefined) {
        setAvatar(e.detail.avatarUrl || null);
      }
    };

    const handleToggleMobile = () => {
      setMobileOpen((prev) => !prev);
    };

    window.addEventListener("user-updated", handleUserUpdated);
    window.addEventListener("toggle-mobile-sidebar", handleToggleMobile);

    return () => {
      window.removeEventListener("user-updated", handleUserUpdated);
      window.removeEventListener("toggle-mobile-sidebar", handleToggleMobile);
    };
  }, [user.avatarUrl]);

  // Fecha o menu mobile automaticamente ao navegar para outra página
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
      title: "CONFIGURAÇÕES",
      items: [
        { href: "/dashboard/perfil", label: "Meu Perfil & Foto", icon: Settings },
      ],
    },
    {
      title: "SEGURANÇA",
      items: [
        { href: "/dashboard/auditoria", label: "Logs de Auditoria", icon: History },
      ],
    },
  ];

  // Conteúdo compartilhado do menu
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col justify-between h-full select-none">
      {/* Top Brand com Brasão do Mascote */}
      <div>
        <div className="h-14 flex items-center justify-between px-4 border-b border-[#202225] bg-[#2B2D31]">
          <div className="flex items-center gap-3">
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

          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 text-[#949BA4] hover:text-[#F2F3F5] rounded-md"
              title="Fechar Menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
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
                    onClick={() => isMobile && setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-md transition-colors ${
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

      {/* Footer do Usuário Estilo Discord */}
      <div className="p-2 border-t border-[#202225] bg-[#232428]">
        <div className="flex items-center justify-between p-1.5 rounded-md hover:bg-[#2B2D31] transition-colors">
          <Link
            href="/dashboard/perfil"
            onClick={() => isMobile && setMobileOpen(false)}
            className="flex items-center gap-2 min-w-0 flex-1"
            title="Editar Perfil"
          >
            <div className="relative w-8 h-8 rounded-full bg-[#5865F2] overflow-hidden flex items-center justify-center text-xs font-bold text-white shrink-0 border border-[#383A40]">
              {avatar ? (
                <img
                  src={avatar}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                user.username.substring(0, 2).toUpperCase()
              )}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#23A55A] border-2 border-[#232428]" />
            </div>
            <div className="min-w-0 truncate">
              <div className="font-semibold text-xs text-[#F2F3F5] truncate leading-tight hover:underline">
                {user.username}
              </div>
              <div className="text-[10px] text-[#949BA4] leading-tight">
                {user.role} • {user.server}
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-0.5">
            <Link
              href="/dashboard/perfil"
              onClick={() => isMobile && setMobileOpen(false)}
              className="p-1.5 text-[#949BA4] hover:text-white hover:bg-[#313338] rounded-md transition-colors"
              title="Configurações do Perfil"
            >
              <Settings className="w-3.5 h-3.5" />
            </Link>

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
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Sidebar Fixa em Telas Médias e Grandes (Desktop) */}
      <aside className="hidden md:flex md:w-60 bg-[#2B2D31] border-r border-[#202225] flex-col justify-between h-screen sticky top-0 shrink-0">
        <SidebarContent />
      </aside>

      {/* 2. Gaveta Lateral Mobile (Drawer com Backdrop) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop Escuro com Blur */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Gaveta do Menu */}
          <div className="relative w-64 max-w-[80vw] bg-[#2B2D31] h-full shadow-2xl z-10 flex flex-col justify-between animate-in slide-in-from-left duration-200">
            <SidebarContent isMobile={true} />
          </div>
        </div>
      )}
    </>
  );
}
