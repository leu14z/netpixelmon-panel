"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Monitor,
  Camera,
  MessageSquare,
  Send,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  ArrowLeft,
  Maximize2,
  Volume2,
  VolumeX,
  StopCircle,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

interface ChatMessage {
  id: string;
  senderName: string;
  isStaff: boolean;
  text: string;
  createdAt: string;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};

export default function SupportRoomPage() {
  const params = useParams();
  const router = useRouter();
  const code = params?.code as string;

  // ID único desta aba no navegador
  const peerIdRef = useRef<string>("");
  if (!peerIdRef.current) {
    peerIdRef.current = `peer_${Math.random().toString(36).substring(2, 9)}`;
  }

  const [roomData, setRoomData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRoomClosed, setIsRoomClosed] = useState(false);

  // Identidade do usuário atual na sala
  const [clientRole, setClientRole] = useState<"STAFF" | "PLAYER">("PLAYER");
  const [myNick, setMyNick] = useState<string>("");

  // Presença
  const [presence, setPresence] = useState<{
    staffOnline: boolean;
    playerOnline: boolean;
    staffNick: string | null;
    playerNick: string | null;
  }>({
    staffOnline: false,
    playerOnline: false,
    staffNick: null,
    playerNick: null,
  });

  // Vídeo e Transmissão
  const [isSharing, setIsSharing] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const lastSignalTimeRef = useRef<string>(new Date(Date.now() - 5000).toISOString());
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mobileTab, setMobileTab] = useState<"video" | "chat">("video");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 1. Carregar dados da sala e autenticação
  useEffect(() => {
    if (!code) return;

    fetch(`/api/support/room?code=${code}`)
      .then((res) => {
        if (!res.ok) throw new Error("Sala inexistente ou expirada.");
        return res.json();
      })
      .then(async (data) => {
        if (data.room.status === "CLOSED") {
          setIsRoomClosed(true);
        }
        setRoomData(data.room);

        // Checa se quem acessou é a Staff autenticada
        try {
          const authRes = await fetch("/api/user/profile");
          const authData = await authRes.json();
          if (authData.user) {
            setClientRole("STAFF");
            setMyNick(authData.user.username);
            return;
          }
        } catch {}

        setClientRole("PLAYER");
        setMyNick(data.room.playerNick);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [code]);

  // 2. Loop de Presença / Heartbeat a cada 3s
  useEffect(() => {
    if (!code || isRoomClosed) return;

    const sendHeartbeat = () => {
      fetch("/api/support/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: code,
          senderId: peerIdRef.current,
          senderRole: clientRole,
          signalType: "heartbeat",
          nick: myNick,
        }),
      }).catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 3000);
    return () => clearInterval(interval);
  }, [code, clientRole, myNick, isRoomClosed]);

  // 3. Loop de Sincronização do Chat a cada 1.5s
  useEffect(() => {
    if (!code || isRoomClosed) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/support/chat?code=${code}`);
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
        }
      } catch {}
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 1500);
    return () => clearInterval(interval);
  }, [code, isRoomClosed]);

  // Auto-scroll das mensagens
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 4. Criação e Configuração do RTCPeerConnection
  const getOrCreatePeerConnection = () => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Candidatos ICE
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        fetch("/api/support/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomCode: code,
            senderId: peerIdRef.current,
            senderRole: clientRole,
            signalType: "candidate",
            payload: JSON.stringify(event.candidate),
          }),
        }).catch(() => {});
      }
    };

    // Recebimento da faixa de vídeo remota
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteVideoRef.current.muted = true; // Obrigatório para navegadores permitirem autoplay
        remoteVideoRef.current
          .play()
          .then(() => {
            setHasRemoteStream(true);
          })
          .catch(() => {
            setHasRemoteStream(true);
          });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setHasRemoteStream(false);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  // 5. Polling de Sinais WebRTC e Status da Sala
  useEffect(() => {
    if (!code || isRoomClosed) return;

    const pollSignals = async () => {
      try {
        const res = await fetch(
          `/api/support/signal?code=${code}&peerId=${peerIdRef.current}&after=${encodeURIComponent(
            lastSignalTimeRef.current
          )}`
        );
        const data = await res.json();

        // Se a sala foi fechada por alguém
        if (data.roomClosed) {
          handleCleanupStreams();
          setIsRoomClosed(true);
          return;
        }

        if (data.presence) {
          setPresence(data.presence);
        }

        if (data.signals && data.signals.length > 0) {
          for (const sig of data.signals) {
            lastSignalTimeRef.current = sig.createdAt;

            if (sig.signalType === "room_closed") {
              handleCleanupStreams();
              setIsRoomClosed(true);
              return;
            }

            if (sig.signalType === "offer") {
              const pc = getOrCreatePeerConnection();

              // Garante transceivers para receber áudio e vídeo
              pc.addTransceiver("video", { direction: "recvonly" });
              pc.addTransceiver("audio", { direction: "recvonly" });

              const offerDesc = new RTCSessionDescription(JSON.parse(sig.payload));
              await pc.setRemoteDescription(offerDesc);

              // Processa candidatos que chegaram antes da oferta
              while (pendingCandidatesRef.current.length > 0) {
                const cand = pendingCandidatesRef.current.shift();
                if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
              }

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              await fetch("/api/support/signal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  roomCode: code,
                  senderId: peerIdRef.current,
                  senderRole: clientRole,
                  signalType: "answer",
                  payload: JSON.stringify(answer),
                }),
              });
            } else if (sig.signalType === "answer") {
              if (peerConnectionRef.current) {
                const answerDesc = new RTCSessionDescription(JSON.parse(sig.payload));
                await peerConnectionRef.current.setRemoteDescription(answerDesc);

                while (pendingCandidatesRef.current.length > 0) {
                  const cand = pendingCandidatesRef.current.shift();
                  if (cand) await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(cand));
                }
              }
            } else if (sig.signalType === "candidate") {
              if (sig.payload) {
                const candData = JSON.parse(sig.payload);
                if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
                  try {
                    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candData));
                  } catch {}
                } else {
                  pendingCandidatesRef.current.push(candData);
                }
              }
            } else if (sig.signalType === "stop") {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null;
              }
              setHasRemoteStream(false);
            }
          }
        }
      } catch {}
    };

    const interval = setInterval(pollSignals, 1000);
    return () => clearInterval(interval);
  }, [code, clientRole, isRoomClosed]);

  // 6. Iniciar Compartilhamento de Tela (PC)
  const handleStartScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
          frameRate: { ideal: 30, max: 60 },
        },
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      setIsSharing(true);

      const pc = getOrCreatePeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true,
      });
      await pc.setLocalDescription(offer);

      await fetch("/api/support/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: code,
          senderId: peerIdRef.current,
          senderRole: clientRole,
          signalType: "offer",
          payload: JSON.stringify(offer),
        }),
      });

      stream.getVideoTracks()[0].onended = () => {
        handleStopShare();
      };
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        alert("Não foi possível capturar a tela. Verifique as permissões do seu navegador.");
      }
    }
  };

  // 7. Iniciar Câmera (Celular ou Webcam)
  const handleStartCameraShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      setIsSharing(true);

      const pc = getOrCreatePeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true,
      });
      await pc.setLocalDescription(offer);

      await fetch("/api/support/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: code,
          senderId: peerIdRef.current,
          senderRole: clientRole,
          signalType: "offer",
          payload: JSON.stringify(offer),
        }),
      });
    } catch {
      alert("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  // 8. Parar Transmissão
  const handleStopShare = () => {
    handleCleanupStreams();
    setIsSharing(false);

    fetch("/api/support/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomCode: code,
        senderId: peerIdRef.current,
        senderRole: clientRole,
        signalType: "stop",
      }),
    }).catch(() => {});
  };

  const handleCleanupStreams = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setHasRemoteStream(false);
  };

  // 9. Enviar Mensagem no Chat
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || sendingMsg) return;

    const textToSend = inputMsg.trim();
    setInputMsg("");
    setSendingMsg(true);

    try {
      await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: code,
          senderName: myNick || (clientRole === "STAFF" ? "Staff" : "Jogador"),
          isStaff: clientRole === "STAFF",
          text: textToSend,
        }),
      });

      const res = await fetch(`/api/support/chat?code=${code}`);
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch {
    } finally {
      setSendingMsg(false);
    }
  };

  // 10. Encerrar Sala de Atendimento (Comunicação para todos)
  const handleCloseRoom = async () => {
    if (!confirm("Deseja realmente finalizar esta sala de atendimento para todos?")) return;

    handleCleanupStreams();

    // 1. Envia sinal de finalização para os outros participantes
    await fetch("/api/support/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomCode: code,
        senderId: peerIdRef.current,
        senderRole: "STAFF",
        signalType: "room_closed",
      }),
    });

    // 2. Atualiza no banco
    await fetch("/api/support/room", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, notes: "Atendimento concluído via tela ao vivo." }),
    });

    setIsRoomClosed(true);
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const toggleAudio = () => {
    if (remoteVideoRef.current) {
      const nextMuted = !remoteVideoRef.current.muted;
      remoteVideoRef.current.muted = nextMuted;
      setIsAudioMuted(nextMuted);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1E1F22] text-[#949BA4] flex items-center justify-center text-xs">
        <span className="w-5 h-5 border-2 border-[#5865F2]/30 border-t-[#5865F2] rounded-full animate-spin mr-2" />
        Carregando sala de suporte...
      </div>
    );
  }

  // TELA QUANDO A SALA FOR ENCERRADA (Para Staff e Jogador)
  if (isRoomClosed) {
    return (
      <div className="min-h-screen bg-[#1E1F22] text-[#DBDEE1] flex items-center justify-center p-4 select-none font-sans">
        <div className="bg-[#2B2D31] border border-[#202225] rounded-xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-full bg-[#23A55A]/20 border border-[#23A55A]/40 text-[#23A55A] flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-[#F2F3F5]">Atendimento Finalizado</h2>
            <p className="text-xs text-[#949BA4] leading-relaxed">
              Esta sessão de suporte ao vivo foi concluída com sucesso pela equipe do <b>NetPixelmon</b>.
            </p>
          </div>

          <div className="p-3 bg-[#1E1F22] rounded-lg border border-[#202225] text-xs text-[#DBDEE1]">
            Código da Sala: <span className="font-mono font-bold text-[#5865F2]">{code}</span>
          </div>

          <div className="pt-2">
            {clientRole === "STAFF" ? (
              <Link
                href="/dashboard/suporte"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold rounded-md transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao Painel da Staff</span>
              </Link>
            ) : (
              <p className="text-[11px] text-[#949BA4]">
                Você já pode fechar esta aba no seu navegador. Bom jogo!
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="min-h-screen bg-[#1E1F22] text-[#DBDEE1] flex flex-col items-center justify-center p-4">
        <div className="p-6 bg-[#2B2D31] border border-[#202225] rounded-lg text-center max-w-sm space-y-4 shadow-xl">
          <AlertCircle className="w-10 h-10 text-[#DA373C] mx-auto" />
          <h2 className="text-base font-bold text-[#F2F3F5]">Sala Não Encontrada</h2>
          <p className="text-xs text-[#949BA4]">{error || "Link expirado ou inexistente."}</p>
          <Link
            href="/dashboard/suporte"
            className="inline-block px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-xs font-semibold rounded text-white"
          >
            Voltar ao Painel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1E1F22] text-[#DBDEE1] flex flex-col h-screen overflow-hidden font-sans">
      {/* Top Header */}
      <header className="border-b border-[#202225] bg-[#2B2D31] px-3 sm:px-4 py-2.5 shrink-0 select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {clientRole === "STAFF" && (
              <Link
                href="/dashboard/suporte"
                className="p-1.5 text-[#949BA4] hover:text-white rounded hover:bg-[#313338] transition-colors"
                title="Voltar ao Painel"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
            )}

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#1E1F22] p-0.5 flex items-center justify-center border border-[#383A40]">
                <Image src="/mascot.png" alt="NetPixelmon" width={22} height={22} className="object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#F2F3F5]">Suporte Ao Vivo</span>
                  <span className="font-mono text-[10px] font-bold bg-[#5865F2]/20 text-[#5865F2] px-1.5 py-0.2 rounded">
                    {roomData.code}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[#949BA4]">
                  <span>Você: <b className="text-[#F2F3F5]">{myNick}</b> ({clientRole === "STAFF" ? "Staff" : "Jogador"})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Indicadores de Presença */}
          <div className="hidden lg:flex items-center gap-4 text-xs bg-[#1E1F22] px-3 py-1 rounded border border-[#202225]">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  presence.staffOnline ? "bg-[#23A55A] animate-pulse" : "bg-[#4E5058]"
                }`}
              />
              <span className="text-[#949BA4] text-[11px]">Staff:</span>
              <span className={`font-semibold text-[11px] ${presence.staffOnline ? "text-[#23A55A]" : "text-[#949BA4]"}`}>
                {presence.staffNick || roomData.staff?.username || "Staff"} ({presence.staffOnline ? "Online" : "Ausente"})
              </span>
            </div>

            <div className="w-px h-3 bg-[#383A40]" />

            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  presence.playerOnline ? "bg-[#23A55A] animate-pulse" : "bg-[#F0B232]"
                }`}
              />
              <span className="text-[#949BA4] text-[11px]">Jogador:</span>
              <span className={`font-semibold text-[11px] ${presence.playerOnline ? "text-[#23A55A]" : "text-[#F0B232]"}`}>
                {roomData.playerNick} ({presence.playerOnline ? "Online" : "Aguardando..."})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyRoomLink}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#4E5058] hover:bg-[#6D6F78] text-[#F2F3F5] rounded text-[11px] font-medium transition-colors"
              title="Copiar link da sala"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-[#23A55A]" /> : <Copy className="w-3.5 h-3.5 text-[#DBDEE1]" />}
              <span className="hidden sm:inline">{copiedLink ? "Link Copiado" : "Copiar Link"}</span>
            </button>

            {clientRole === "STAFF" && (
              <button
                onClick={handleCloseRoom}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#DA373C] hover:bg-[#A12828] text-white rounded text-[11px] font-medium transition-colors"
                title="Finalizar atendimento para todos"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Finalizar Atendimento</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Seletor Mobile (Vídeo vs Chat) */}
      <div className="md:hidden flex border-b border-[#202225] bg-[#2B2D31] text-xs font-semibold">
        <button
          onClick={() => setMobileTab("video")}
          className={`flex-1 py-2 text-center border-b-2 transition-colors ${
            mobileTab === "video" ? "border-[#5865F2] text-[#F2F3F5]" : "border-transparent text-[#949BA4]"
          }`}
        >
          Transmissão {hasRemoteStream || isSharing ? "🔴 Ao Vivo" : ""}
        </button>
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex-1 py-2 text-center border-b-2 transition-colors ${
            mobileTab === "chat" ? "border-[#5865F2] text-[#F2F3F5]" : "border-transparent text-[#949BA4]"
          }`}
        >
          Chat ({messages.length})
        </button>
      </div>

      {/* Corpo Principal da Sala */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-[#1E1F22]">
        {/* LADO ESQUERDO: ÁREA DE TRANSMISSÃO DE VÍDEO */}
        <div
          className={`flex-1 flex flex-col bg-[#1E1F22] p-3 sm:p-4 min-h-0 ${
            mobileTab === "chat" ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="flex-1 bg-black rounded-lg border border-[#202225] overflow-hidden relative flex items-center justify-center min-h-[260px] shadow-inner">
            {/* 1. Vídeo Remoto (Para quem está assistindo) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={isAudioMuted}
              className={`w-full h-full object-contain ${hasRemoteStream ? "block" : "hidden"}`}
            />

            {/* 2. Prévia do Vídeo Local (Para quem está transmitindo) */}
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-contain ${isSharing && !hasRemoteStream ? "block" : "hidden"}`}
            />

            {/* Selo Ao Vivo e Botão de Áudio */}
            {(hasRemoteStream || isSharing) && (
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white pointer-events-auto">
                  <span className="w-2 h-2 rounded-full bg-[#DA373C] animate-pulse" />
                  <span>{isSharing ? "VOCÊ ESTÁ TRANSMITINDO" : "TRANSMISSÃO AO VIVO (P2P)"}</span>
                </div>

                {hasRemoteStream && (
                  <button
                    onClick={toggleAudio}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-white pointer-events-auto hover:bg-black transition-colors"
                  >
                    {isAudioMuted ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-[#DA373C]" />
                        <span>Áudio Mutado (Clique para ouvir)</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-[#23A55A]" />
                        <span>Áudio Ativo</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* 3. Tela de Espera quando ninguém está transmitindo */}
            {!hasRemoteStream && !isSharing && (
              <div className="p-6 text-center max-w-md space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#2B2D31] border border-[#383A40] flex items-center justify-center mx-auto text-[#5865F2] shadow-lg">
                  <Monitor className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#F2F3F5]">Aguardando Início da Transmissão</h3>
                  <p className="text-xs text-[#949BA4] leading-relaxed">
                    Você ou a outra pessoa podem iniciar a transmissão abaixo para inspecionar erros no Minecraft ou Launcher.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                  <button
                    onClick={handleStartScreenShare}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold rounded-md shadow transition-colors"
                  >
                    <Monitor className="w-4 h-4" />
                    <span>Compartilhar Tela (PC)</span>
                  </button>

                  <button
                    onClick={handleStartCameraShare}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-[#4E5058] hover:bg-[#6D6F78] text-[#F2F3F5] text-xs font-semibold rounded-md transition-colors"
                    title="Ideal para celular apontando para a tela do PC"
                  >
                    <Camera className="w-4 h-4 text-[#23A55A]" />
                    <span>Abrir Câmera (Celular)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Barra de Controles de Transmissão */}
          <div className="mt-3 flex items-center justify-between gap-2 p-2 bg-[#2B2D31] border border-[#202225] rounded-lg text-xs">
            <div className="flex items-center gap-2">
              {isSharing ? (
                <button
                  onClick={handleStopShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#DA373C] hover:bg-[#A12828] text-white rounded text-xs font-semibold transition-colors"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  <span>Parar Minha Transmissão</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleStartScreenShare}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#313338] hover:bg-[#35373C] text-[#DBDEE1] hover:text-white rounded text-xs transition-colors border border-[#383A40]"
                  >
                    <Monitor className="w-3.5 h-3.5 text-[#5865F2]" />
                    <span>Tela (PC)</span>
                  </button>
                  <button
                    onClick={handleStartCameraShare}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#313338] hover:bg-[#35373C] text-[#DBDEE1] hover:text-white rounded text-xs transition-colors border border-[#383A40]"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#23A55A]" />
                    <span>Câmera (Celular)</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#949BA4]">
              <span className="hidden sm:inline">P2P Conectado</span>
              <button
                onClick={() => {
                  const target = remoteVideoRef.current || localVideoRef.current;
                  if (target?.requestFullscreen) target.requestFullscreen();
                }}
                className="p-1.5 text-[#949BA4] hover:text-white rounded hover:bg-[#313338]"
                title="Tela Cheia"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* LADO DIREITO: CHAT EM TEMPO REAL */}
        <div
          className={`w-full md:w-80 lg:w-96 border-l border-[#202225] bg-[#2B2D31] flex flex-col min-h-0 shrink-0 ${
            mobileTab === "video" ? "hidden md:flex" : "flex flex-1"
          }`}
        >
          {/* Header do Chat */}
          <div className="p-3 border-b border-[#202225] bg-[#2B2D31] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#5865F2]" />
              <span className="font-bold text-xs text-[#F2F3F5]">Chat com a Staff</span>
            </div>
            <span className="text-[10px] text-[#23A55A] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#23A55A] animate-pulse" />
              Ao Vivo
            </span>
          </div>

          {/* Lista de Mensagens */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
            {messages.length === 0 ? (
              <div className="text-center text-[#949BA4] text-[11px] py-10">
                Nenhuma mensagem enviada ainda. Digite abaixo para conversar em tempo real!
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderName === myNick;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col space-y-0.5 ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-[#949BA4]">
                      <span className={`font-semibold ${msg.isStaff ? "text-[#5865F2]" : "text-[#F2F3F5]"}`}>
                        {msg.senderName}
                      </span>
                      {msg.isStaff && (
                        <span className="px-1 py-0.1 text-[8px] font-bold rounded bg-[#5865F2]/20 text-[#5865F2]">
                          STAFF
                        </span>
                      )}
                      <span>• {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div
                      className={`px-3 py-2 rounded-lg max-w-[85%] text-xs leading-relaxed break-words shadow-sm ${
                        isMe
                          ? "bg-[#5865F2] text-white rounded-tr-none"
                          : "bg-[#313338] text-[#DBDEE1] rounded-tl-none border border-[#202225]"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input de Envio de Mensagem */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-[#202225] bg-[#232428] flex items-center gap-2">
            <input
              type="text"
              required
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Digite sua mensagem aqui..."
              className="flex-1 bg-[#1E1F22] border border-[#202225] rounded-md py-2 px-3 text-xs text-[#F2F3F5] placeholder-[#949BA4] focus:outline-none focus:border-[#5865F2]"
            />
            <button
              type="submit"
              disabled={sendingMsg || !inputMsg.trim()}
              className="p-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-md transition-colors disabled:opacity-40 shrink-0"
              title="Enviar Mensagem"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
