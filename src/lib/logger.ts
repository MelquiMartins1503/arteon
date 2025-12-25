/**
 * Logger Configuration
 * Simple console logger replacement
 */

const createLogger = (service: string) => {
  return {
    info: (obj: object | string, msg?: string) => {
      console.log(`[${service}] INFO:`, msg || obj, msg ? obj : "");
    },
    error: (obj: object | string, msg?: string) => {
      console.error(`[${service}] ERROR:`, msg || obj, msg ? obj : "");
    },
    warn: (obj: object | string, msg?: string) => {
      console.warn(`[${service}] WARN:`, msg || obj, msg ? obj : "");
    },
    debug: (_obj: object | string, _msgg?: string) => {
      // Uncomment to see debug logs
      // console.debug(`[${service}] DEBUG:`, msg || obj, msg ? obj : "");
    },
    child: (bindings: object) => {
      return createLogger(`${service}:${JSON.stringify(bindings)}`);
    },
  };
};

export const storageLogger = createLogger("storage");

/**
 * Create request logger with correlation ID
 */
export function createRequestLogger(correlationId: string) {
  return storageLogger.child({ correlationId });
}
