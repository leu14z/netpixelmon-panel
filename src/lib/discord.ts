// Notificador de Webhook do Discord para Logs Internos da Staff NetPixelmon

interface WebhookField {
  name: string;
  value: string;
  inline?: boolean;
}

interface WebhookPayload {
  title: string;
  description?: string;
  color?: number; // decimal RGB (ex: 0x38BDF8 = 3718648)
  fields?: WebhookField[];
  footerText?: string;
}

export async function sendDiscordStaffLog(payload: WebhookPayload) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    // Se não tiver webhook configurado no .env, não falha silenciosamente
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "NetPixelmon Staff Bot",
        avatar_url: "https://netpixelmon.com/assets/mascot.png",
        embeds: [
          {
            title: payload.title,
            description: payload.description || "",
            color: payload.color || 0x38bdf8, // Azul celeste NetPixelmon
            fields: payload.fields || [],
            footer: {
              text: payload.footerText || "Painel de Controle • NetPixelmon Staff",
            },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (error) {
    console.error("Falha ao enviar webhook do Discord:", error);
  }
}
