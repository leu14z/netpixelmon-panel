"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Play, Square, Users, Check, AlertCircle, Menu } from "lucide-react";

interface DesktopHeaderProps {
  user: {
    id?: string;
    userId?: string;
    username: string;
    role: string;
    server: string;
  };
}

export function DesktopHeader({ user }: DesktopHeaderProps) {
  const [activeShift, setActiveShift] = useState<{ id: string; startedAt: string } | null>(null);
  const [onDutyCount, setOnDutyCount] = useState<number>(0);
  const [onDutyList, setOnDutyList] = useState<any[]>([]);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showDutyDropdown, setShowDutyDropdown] = useState(false);

  const fetchShiftStatus = async () => {
    try {
      const res = await fetch("/api/rh/shift");
      const data = await res.json();
      if (data.activeShift) {
        setActiveShift(data.activeShift);
        const diffSec = Math.floor(
          (Date.now() - new Date(data.activeShift.startedAt).getTime()) / 1000
        );
        setElapsedSeconds(Math.max(0, diffSec));
      } else {
        setActiveShift(null);
        setElapsedSeconds(0);
      }
      if (data.activeStaffCount !== undefined) {
        setOnDutyCount(data.activeStaffCount);
      }
      if (data.onDutyStaff) {
        setOnDutyList(data.onDutyStaff);
      }
    } catch {}
  };

  useEffect(() => {
    fetchShiftStatus();
    const handleShiftUpdated = () => fetchShiftStatus();
    window.addEventListener("shift-updated", handleShiftUpdated);
    return () => window.removeEventListener("shift-updated", handleShiftUpdated);
  }, []);

  useEffect(() => {
    if (!activeShift) return;
    const interval = setInterval(() => {
      const diffSec = Math.floor(
        (Date.now() - new Date(activeShift.startedAt).getTime()) / 1000
      );
      setElapsedSeconds(Math.max(0, diffSec));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeShift]);

  const handleToggleShift = async () => {
    setShiftLoading(true);
    setToastMsg(null);
    const action = activeShift ? "STOP" : "START";

    try {
      const res = await fetch("/api/rh/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok) {
        setToastMsg({ type: "error", text: data.error || "Erro ao registrar ponto." });
        return;
      }

      if (action === "START") {
        setActiveShift(data.shift);
        setElapsedSeconds(0);
        setToastMsg({ type: "success", text: "Turno iniciado! Bom trabalho." });
      } else {
        setActiveShift(null);
        setElapsedSeconds(0);
        setToastMsg({ type: "success", text: data.message || "Turno finalizado com sucesso." });
      }

      fetchShiftStatus();
      window.dispatchEvent(new Event("shift-updated"));
      setTimeout(() => setToastMsg(null), 3000);
    } catch {
      setToastMsg({ type: "error", text: "Erro ao conectar com o servidor." });
    } finally {
      setShiftLoading(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <header className="h-14 border-b border-[#202225] bg-[#313338] px-3 sm:px-5 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* Toast Notifier */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-50 px-3.5 py-2 rounded-md text-xs font-medium shadow-2xl flex items-center gap-2 transition-all animate-in fade-in slide-in-from-top-2 ${
            toastMsg.type === "success"
              ? "bg-[#23A55A] text-white"
              : "bg-[#DA373C] text-white"
          }`}
        >
          {toastMsg.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Esquerda: Botão Menu Mobile + Servidor */}
      <div className="flex items-center gap-2">
        {/* Botão Hambúrguer no Celular */}
        <button
          onClick={() => window.dispatchEvent(new Event("toggle-mobile-sidebar"))}
          className="md:hidden p-1.5 -ml-1 text-[#949BA4] hover:text-[#F2F3F5] rounded-md transition-colors"
          title="Abrir Menu"
          aria-label="Abrir Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mascote no mobile */}
        <div className="md:hidden w-7 h-7 rounded-full bg-[#1E1F22] p-0.5 flex items-center justify-center shrink-0 border border-[#383A40]">
          <Image
            src="/mascot.png"
            alt="NetPixelmon"
            width={22}
            height={22}
            className="object-contain"
          />
        </div>

        {/* Tag do Servidor */}
        <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded bg-[#2B2D31] text-xs text-[#DBDEE1]">
          <span className="hidden sm:inline text-[#949BA4] text-[11px]">Servidor:</span>
          <span className="font-bold text-[11px] text-[#5865F2] font-mono">{user.server}</span>
        </div>
      </div>

      {/* Direita: Staff Online e Botão de Ponto */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Dropdown de Staffs em Turno */}
        <div className="relative">
          <button
            onClick={() => setShowDutyDropdown(!showDutyDropdown)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-md bg-[#2B2D31] hover:bg-[#35373C] text-xs text-[#DBDEE1] transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-[#23A55A]" />
            <Users className="w-3.5 h-3.5 text-[#949BA4]" />
            <span className="hidden sm:inline font-medium">{onDutyCount} Staffs Online</span>
            <span className="sm:hidden font-medium">{onDutyCount}</span>
          </button>

          {showDutyDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-[#2B2D31] border border-[#202225] rounded-md shadow-2xl p-2.5 z-50 text-xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#949BA4] block border-b border-[#202225] pb-1.5">
                Staffs com Ponto Aberto
              </span>
              {onDutyList.length === 0 ? (
                <p className="text-[11px] text-[#949BA4] py-1">Nenhum membro em turno no momento.</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {onDutyList.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between p-1.5 rounded bg-[#313338]"
                    >
                      <div>
                        <span className="font-medium text-[#F2F3F5]">{st.user.username}</span>
                        <span className="block text-[9px] text-[#949BA4]">{st.user.role} • {st.server}</span>
                      </div>
                      <span className="text-[10px] text-[#23A55A] font-medium">Em Plantão</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botão de Ponto Responsivo */}
        <button
          onClick={handleToggleShift}
          disabled={shiftLoading}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all shadow-sm ${
            activeShift
              ? "bg-[#DA373C] hover:bg-[#A12828] text-white"
              : "bg-[#23A55A] hover:bg-[#1F9250] text-white"
          }`}
          title={activeShift ? "Clique para finalizar seu turno" : "Iniciar registro de ponto"}
        >
          {shiftLoading ? (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : activeShift ? (
            <>
              <Square className="w-3 h-3 text-white fill-current" />
              <span className="font-mono font-bold text-[11px] sm:text-xs">{formatTime(elapsedSeconds)}</span>
              <span className="hidden sm:inline text-[11px] opacity-80">• Encerrar</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 text-white fill-current" />
              <span className="hidden sm:inline">Bater Ponto</span>
              <span className="sm:hidden">Ponto</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
