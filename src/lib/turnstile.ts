import { env } from "./env";

/**
 * PROTEÇÃO CONTRA BOTS (Cloudflare Turnstile)
 * Valida o token gerado no frontend diretamente na API da Cloudflare no lado do servidor.
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<boolean> {
  // Em modo de testes com chave default da Cloudflare
  if (token === "XXXX.DUMMY.TOKEN.XXXX" || env.TURNSTILE_SECRET_KEY.startsWith("1x0000000000000000000000")) {
    return true;
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", env.TURNSTILE_SECRET_KEY);
    formData.append("response", token);
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    return data.success === true;
  } catch (error) {
    console.error("Erro na verificação do Cloudflare Turnstile:", error);
    return false;
  }
}
