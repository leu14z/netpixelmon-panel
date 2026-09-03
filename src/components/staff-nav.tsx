"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Video,
  ShieldAlert,
  History,
  LogOut,
  Play,
  Square,
} from "lucide-react";

interface StaffNavProps {
  user: {
    id?: string;
    userId?: string;
    username: string;
    role: string;
    server: string;
  };
}

export function StaffNav({ user }: StaffNavProps) {
  const pathname = usePathname();
  const [activeShift, setActiveShift] = useState<{ id: string; startedAt: string } | null>(null);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  // Carregar status do ponto
  useEffect(() => {
    fetch("/api/rh/shift")
      .then((res) => res.json())
      .then((data) => {
        if (data.activeShift) {
          setActiveShift(data.activeShift);
          const diff = Math.floor(
            (Date.now() - new Date(data.activeShift.startedAt).getTime()) / (1000 * 60)
          );
          setElapsedMinutes(Math.max(0, diff));
        }
      })
      .catch(() => {});
  }, []);

  // Timer do turno ativo
  useEffect(() => {
    if (!activeShift) return;
    const interval = setInterval(() => {
      const diff = Math.floor(
        (Date.now() - new Date(activeShift.startedAt).getTime()) / (1000 * 60)
      );
      setElapsedMinutes(Math.max(0, diff));
    }, 30000);
    return () => clearInterval(interval);
  }, [activeShift]);

  const handleToggleShift = async () => {
    setShiftLoading(true);
    try {
      const action = activeShift ? "STOP" : "START";
      const res = await fetch("/api/rh/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        if (action === "START") {
          setActiveShift(data.shift);
          setElapsedMinutes(0);
        } else {
          setActiveShift(null);
          setElapsedMinutes(0);
        }
      }
    } catch {
    } finally {
      setShiftLoading(false);
    }
  };

  const navItems = [
    { href: "/dashboard", label: "Visão Geral", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/rh", label: "Recursos Humanos", icon: Users },
    { href: "/dashboard/suporte", label: "Suporte ao Vivo", icon: Video },
    { href: "/dashboard/punicoes", label: "Punições", icon: ShieldAlert },
    { href: "/dashboard/auditoria", label: "Auditoria", icon: History },
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "OWNER":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "ADMIN":
        return "bg-purple-500/15 text-purple-300 border-purple-500/30";
      case "MODERATOR":
        return "bg-sky-500/15 text-sky-300 border-sky-500/30";
      default:
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    }
  };

  const getServerBadge = (server: string) => {
    if (server === "CYAN") return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    if (server === "ORANGE") return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    return "bg-slate-800 text-slate-400 border-slate-700";
  };

  return (
    <header className="border-b border-[#1A2030] bg-[#0A0D14] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand com Mascote */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="relative w-9 h-9 flex-shrink-0 transition-transform group-hover:scale-105">
                <Image
                  src="/mascot.png"
                  alt="Mascote NetPixelmon"
                  width={36}
                  height={36}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm tracking-tight text-slate-100">
                    NetPixelmon
                  </span>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded bg-[#161B26] text-slate-400 border border-[#222938]">
                    Staff
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  painel interno
                </span>
              </div>
            </Link>

            {/* Links de Navegação */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      isActive
                        ? "bg-[#161B26] text-slate-100 border border-[#262E40]"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#121620]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Área do Usuário & Controle de Ponto */}
          <div className="flex items-center gap-3">
            {/* Botão de Ponto / Turno */}
            <button
              onClick={handleToggleShift}
              disabled={shiftLoading}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                activeShift
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                  : "bg-[#121620] border-[#1F2535] text-slate-300 hover:bg-[#181D2A] hover:text-white"
              }`}
              title={activeShift ? "Clique para finalizar turno" : "Iniciar registro de ponto"}
            >
              {activeShift ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono">{elapsedMinutes}m em turno</span>
                  <Square className="w-3 h-3 text-emerald-400 ml-1" />
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-slate-400" />
                  <span>Abrir Turno</span>
                </>
              )}
            </button>

            {/* Informações do Membro */}
            <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-[#1A2030]">
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-xs font-medium text-slate-200">
                    {user.username}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 text-[9px] font-bold uppercase rounded border ${getServerBadge(
                      user.server
                    )}`}
                  >
                    {user.server}
                  </span>
                </div>
                <span
                  className={`inline-block px-1.5 py-0.2 text-[9px] font-bold uppercase rounded border ${getRoleBadge(
                    user.role
                  )}`}
                >
                  {user.role}
                </span>
              </div>
            </div>

            {/* Logout */}
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Sair do painel"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
