/**
 * RATE LIMITER (Janela Deslizante / Sliding Window)
 * Proteção contra força bruta em login, APIs e spam de ações no servidor.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

// Limpeza automática periódica de registros antigos da memória
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (now > record.resetAt) {
      memoryStore.delete(key);
    }
  }
}, 60 * 1000);

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Checa se uma chave excedeu o limite de requisições
 * @param identifier IP do usuário, ID do usuário ou chave de API
 * @param action Identificador da ação (ex: "login", "punish_create")
 * @param limit Número máximo de tentativas permitidas
 * @param windowSeconds Janela de tempo em segundos (ex: 900 = 15 min)
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
  limit: number = 5,
  windowSeconds: number = 900
): Promise<RateLimitResult> {
  const key = `${action}:${identifier}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  let record = memoryStore.get(key);

  if (!record || now > record.resetAt) {
    record = {
      count: 1,
      resetAt: now + windowMs,
    };
    memoryStore.set(key, record);
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetInSeconds: windowSeconds,
    };
  }

  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetInSeconds: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count += 1;
  memoryStore.set(key, record);

  return {
    success: true,
    limit,
    remaining: limit - record.count,
    resetInSeconds: Math.ceil((record.resetAt - now) / 1000),
  };
}
