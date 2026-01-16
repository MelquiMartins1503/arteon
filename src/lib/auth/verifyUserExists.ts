import logger from "@/lib/logger";
import prismaClient from "@/lib/prismaClient";

// Cache simples em memória para reduzir queries ao banco
const userExistsCache = new Map<
  number,
  { exists: boolean; timestamp: number }
>();
const CACHE_TTL = 60000; // 60 segundos

/**
 * Verifica se um usuário existe no banco de dados
 * Usa cache em memória para reduzir queries frequentes
 */
export async function verifyUserExists(userId: number): Promise<boolean> {
  // Verificar cache
  const cached = userExistsCache.get(userId);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.exists;
  }

  // Query ao banco
  try {
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { id: true }, // Apenas ID para otimizar
    });

    const exists = user !== null;

    // Atualizar cache
    userExistsCache.set(userId, { exists, timestamp: now });

    // Cleanup do cache (remove entradas antigas a cada 100 verificações)
    if (userExistsCache.size > 100) {
      for (const [key, value] of userExistsCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          userExistsCache.delete(key);
        }
      }
    }

    return exists;
  } catch (error) {
    logger.error({ error, userId }, "Failed to verify user existence");
    // Em caso de erro, assume que não existe por segurança
    return false;
  }
}

/**
 * Invalida o cache para um usuário específico
 * Útil quando um usuário é deletado
 */
export function invalidateUserCache(userId: number): void {
  userExistsCache.delete(userId);
}

/**
 * Limpa todo o cache
 */
export function clearUserCache(): void {
  userExistsCache.clear();
}
