/**
 * Rate Limiter usando Map em memória
 * Para produção, considere usar Redis ou Upstash
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// Armazena: IP ou userId -> { count, resetAt }
const rateLimitStore = new Map<string, RateLimitRecord>();

// Limpa registros expirados a cada 1 minuto
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

export interface RateLimitConfig {
  /**
   * Número máximo de requisições permitidas no intervalo
   * @default 100
   */
  maxRequests?: number;

  /**
   * Janela de tempo em segundos
   * @default 60
   */
  windowSeconds?: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Verifica se uma chave (IP ou userId) excedeu o rate limit
 *
 * @param identifier - Identificador único (IP ou userId)
 * @param config - Configuração do rate limiter
 * @returns Resultado com sucesso e headers informativos
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = {},
): RateLimitResult {
  const maxRequests = config.maxRequests ?? 100;
  const windowSeconds = config.windowSeconds ?? 60;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  let record = rateLimitStore.get(identifier);

  // Se não existe ou expirou, cria novo registro
  if (!record || record.resetAt < now) {
    record = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(identifier, record);

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: record.resetAt,
    };
  }

  // Incrementa contador
  record.count++;

  // Verifica se excedeu o limite
  if (record.count > maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: record.resetAt,
    };
  }

  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - record.count,
    reset: record.resetAt,
  };
}

/**
 * Reseta o rate limit para um identificador específico
 * Útil para testes ou casos especiais
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}
