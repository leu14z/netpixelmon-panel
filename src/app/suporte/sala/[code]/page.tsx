"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Monitor,
  MonitorPlay,
  MonitorStop,
  Camera,
  MessageSquare,
  Send,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  ArrowLeft,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: string;
  isStaff: boolean;
  text: string;
  time: string;
}

export default function SupportRoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = params?.code as string;

  const [roomData, setRoomData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de Transmissão de Tela
  const [isSharing, setIsSharing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "Sistema",
      isStaff: false,
      text: "Sala de suporte criada. O jogador pode compartilhar a tela clicando no botão abaixo.",
      time: "Agora",
    },
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [userName, setUserName] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Carregar dados da sala
  useEffect(() => {
    if (!code) return;
    fetch(`/api/support/room?code=${code}`)
      .then((res) => {
        if (!res.ok) throw new Error("Sala inexistente ou expirada.");
        return res.json();
      })
      .then((data) => {
        setRoomData(data.room);
        setUserName(data.room.playerNick);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [code]);

  // Iniciar Transmissão de Tela (Nativo via Browser getDisplayMedia)
  const handleStartShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
        },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsSharing(true);

      // Ouvir quando o usuário parar a transmissão pela barra do navegador
      stream.getVideoTracks()[0].onended = () => {
        handleStopShare();
      };

      // Notificar no chat
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "Sistema",
          isStaff: false,
          text: "Transmissão de tela iniciada com sucesso.",
          time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        alert("Não foi possível capturar a tela. Verifique as permissões do seu navegador.");
      }
    }
  };

  // Parar Transmissão
  const handleStopShare = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsSharing(false);
  };

  // Capturar Print da Tela (Snapshot)
  const handleCaptureSnapshot = () => {
    if (!videoRef.current || !isSharing) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 1920;
    canvas.height = videoRef.current.videoHeight || 1080;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");

      // Download automático da captura
      const link = document.createElement("a");
      link.download = `snapshot-suporte-${code}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "Sistema",
          isStaff: true,
          text: "📸 Snapshot da tela capturado e salvo.",
          time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  };

  // Enviar Mensagem de Chat
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: userName || "Jogador",
      isStaff: false,
      text: inputMsg.trim(),
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMsg("");
  };

  // Encerrar Sala
  const handleCloseRoom = async () => {
    if (!confirm("Deseja realmente finalizar esta sala de atendimento?")) return;
    handleStopShare();

    await fetch("/api/support/room", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, notes: "Atendimento concluído via tela ao vivo." }),
    });

    router.push("/dashboard/suporte");
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090E] text-slate-400 flex items-center justify-center text-xs">
        <span className="w-5 h-5 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mr-2" />
        Carregando sala de suporte...
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="min-h-screen bg-[#07090E] text-slate-300 flex flex-col items-center justify-center p-4">
        <div className="p-6 bg-[#0E121A] border border-[#1A2030] rounded-xl text-center max-w-sm space-y-4 shadow-xl">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-base font-bold text-white">Sala Não Encontrada</h2>
          <p className="text-xs text-slate-400">{error || "Este link de atendimento expirou ou é inválido."}</p>
          <Link
            href="/dashboard/suporte"
            className="inline-block px-4 py-2 bg-[#141926] hover:bg-[#1A2234] text-xs font-semibold rounded-lg border border-[#222B40] text-slate-200"
          >
            Voltar para o Painel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1E1F22] text-[#DBDEE1] flex flex-col">
      {/* Top Header da Sala */}
      <header className="border-b border-[#202225] bg-[#2B2D31] px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/suporte"
              className="p-1.5 text-[#949BA4] hover:text-white rounded hover:bg-[#313338] transition-colors"
              title="Voltar ao Painel"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2">
              <Image
                src="/mascot.png"
                alt="Mascote NetPixelmon"
                width={28}
                height={28}
                className="object-contain"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#F2F3F5]">Sala de Suporte</span>
                  <span className="px-1.5 py-0.2 font-mono text-[10px] font-bold bg-[#5865F2]/20 text-[#5865F2] rounded">
                    {roomData.code}
                  </span>
                  {roomData.status === "ACTIVE" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#23A55A] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#23A55A]" />
                      Ao Vivo
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#949BA4] font-mono">Encerrada</span>
                  )}
                </div>
                <p className="text-[10px] text-[#949BA4]">
                  Jogador: {roomData.playerNick} • Suporte: {roomData.staff.username}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyRoomLink}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#4E5058] hover:bg-[#6D6F78] text-[#F2F3F5] rounded text-[11px] font-medium transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-[#23A55A]" /> : <Copy className="w-3.5 h-3.5 text-[#DBDEE1]" />}
              <span>{copiedLink ? "Link Copiado" : "Copiar Link"}</span>
            </button>

            {roomData.status === "ACTIVE" && (
              <button
                onClick={handleCloseRoom}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#DA373C] hover:bg-[#A12828] text-white rounded text-[11px] font-medium transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Finalizar Atendimento</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Grid Principal: Transmissão de Vídeo + Chat Lateral */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Painel de Transmissão (Tela) */}
        <div className="lg:col-span-3 flex flex-col bg-[#0C0F17] border border-[#161B26] rounded-xl overflow-hidden shadow-md">
          {/* Barra de Controles de Vídeo */}
          <div className="px-4 py-2.5 bg-[#090C12] border-b border-[#161B26] flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-sky-400" />
              Transmissão de Tela em Tempo Real
            </span>

            <div className="flex items-center gap-2">
              {isSharing ? (
                <>
                  <button
                    onClick={handleCaptureSnapshot}
                    className="flex items-center gap-1 px-2 py-1 bg-[#161D2C] hover:bg-[#1F273B] border border-[#242E45] text-sky-300 text-xs rounded transition-colors"
                    title="Salvar print do momento atual"
                  >
                    <Camera className="w-3.5 h-3.5 text-sky-400" />
                    <span>Tirar Snapshot</span>
                  </button>
                  <button
                    onClick={handleStopShare}
                    className="flex items-center gap-1 px-2 py-1 bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-300 text-xs rounded transition-colors"
                  >
                    <MonitorStop className="w-3.5 h-3.5" />
                    <span>Parar Transmissão</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartShare}
                  className="flex items-center gap-1.5 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded transition-colors shadow-sm"
                >
                  <MonitorPlay className="w-3.5 h-3.5" />
                  <span>Transmitir Minha Tela</span>
                </button>
              )}
            </div>
          </div>

          {/* Área de Visualização do Vídeo */}
          <div className="flex-1 bg-[#05070B] relative flex items-center justify-center min-h-[420px]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-contain max-h-[680px] ${!isSharing ? "hidden" : "block"}`}
            />

            {!isSharing && (
              <div className="text-center p-8 space-y-4 max-w-md">
                <div className="w-14 h-14 rounded-2xl bg-[#0E121B] border border-[#1A2132] flex items-center justify-center mx-auto text-sky-400 shadow-inner">
                  <Monitor className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Nenhuma tela sendo transmitida no momento</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Se você é o jogador, clique no botão abaixo para escolher a janela do seu Minecraft, Launcher ou pasta de mods.
                  </p>
                </div>
                <button
                  onClick={handleStartShare}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-lg shadow-md transition-colors"
                >
                  <MonitorPlay className="w-4 h-4" />
                  <span>Iniciar Compartilhamento de Tela</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chat de Texto & Instruções */}
        <div className="flex flex-col bg-[#0C0F17] border border-[#161B26] rounded-xl overflow-hidden shadow-md h-full">
          <div className="px-4 py-3 bg-[#090C12] border-b border-[#161B26] flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
              Chat de Suporte
            </span>
            <span className="text-[10px] text-slate-500 font-mono">P2P Seguro</span>
          </div>

          {/* Mensagens */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs min-h-[300px] max-h-[500px]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2.5 rounded-lg text-xs leading-relaxed space-y-0.5 ${
                  msg.sender === "Sistema"
                    ? "bg-[#101420] border border-[#1B2233] text-slate-400 italic text-[11px]"
                    : msg.isStaff
                    ? "bg-purple-950/30 border border-purple-900/40 text-purple-200 ml-4"
                    : "bg-[#141926] border border-[#1F2638] text-slate-200 mr-4"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
                  <span>{msg.sender}</span>
                  <span className="text-slate-600 font-mono">{msg.time}</span>
                </div>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            ))}
          </div>

          {/* Input de Mensagem */}
          <form onSubmit={handleSendMessage} className="p-2.5 border-t border-[#161B26] bg-[#090C12] flex items-center gap-1.5">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Digite uma mensagem ou comando..."
              className="flex-1 bg-[#05070B] border border-[#1A2030] rounded-lg px-2.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              className="p-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors shrink-0"
              title="Enviar"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
