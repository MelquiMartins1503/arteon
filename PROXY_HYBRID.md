# Proxy Híbrido - JWT + Rate Limiting + Logger

Este documento descreve a implementação do proxy híbrido que combina autenticação JWT, rate limiting e logging para proteger sua aplicação Next.js.

## 🎯 Funcionalidades

### 1. **Autenticação JWT**
- Verifica tokens JWT em todas as requisições
- Extrai `userId` do payload para identificação
- Redireciona usuários não autenticados para páginas de login
- Impede acesso de usuários autenticados a rotas públicas (sign-in, sign-up, etc.)

### 2. **Rate Limiting**
- **Limite padrão**: 100 requisições por minuto
- **Identificação inteligente**: Usa `userId` para usuários autenticados, ou IP para visitantes
- **Headers informativos**: Retorna `X-RateLimit-*` headers em todas as respostas
- **Resposta 429**: Quando o limite é excedido, retorna erro com tempo de retry

### 3. **Logging Estruturado**
- Logs detalhados de todos os eventos importantes
- Registro de autenticações bem-sucedidas e falhas
- Monitoramento de violações de rate limit
- Logs de redirecionamento e acessos

## 📊 Fluxo de Execução

```
Requisição → JWT Validation → Rate Limiting → Route Authorization → Response
                    ↓                ↓               ↓                  ↓
                  Logger          Logger          Logger           Headers
```

## 🔧 Configuração

### Rate Limiting

Edite as constantes em `src/proxy.ts`:

```typescript
const RATE_LIMIT_CONFIG = {
  maxRequests: 100,    // Número máximo de requisições
  windowSeconds: 60,   // Janela de tempo em segundos
};
```

### Rotas Públicas

Configure quais rotas são públicas e o comportamento quando autenticado:

```typescript
const publicRoutes = [
  { path: "/sign-in", whenAuthenticated: "redirect" },
  { path: "/sign-up", whenAuthenticated: "redirect" },
  // Adicione mais rotas conforme necessário
] as const;
```

## 📝 Headers de Rate Limit

Todas as respostas incluem os seguintes headers:

| Header | Descrição |
|--------|-----------|
| `X-RateLimit-Limit` | Número máximo de requisições permitidas |
| `X-RateLimit-Remaining` | Requisições restantes na janela atual |
| `X-RateLimit-Reset` | Timestamp (ms) quando o contador reseta |
| `Retry-After` | Segundos até poder tentar novamente (somente em 429) |

## 🚨 Respostas de Erro

### 429 Too Many Requests

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 45
}
```

## 📋 Logs Estruturados

### Autenticação Bem-Sucedida
```json
{
  "level": "debug",
  "userId": "user-123",
  "path": "/dashboard",
  "ip": "192.168.1.1",
  "msg": "Authenticated request"
}
```

### Rate Limit Excedido
```json
{
  "level": "warn",
  "identifier": "user-123",
  "userId": "user-123",
  "ip": "192.168.1.1",
  "path": "/api/data",
  "limit": 100,
  "reset": 1735373425000,
  "msg": "Rate limit exceeded"
}
```

### Requisição Processada
```json
{
  "level": "info",
  "userId": "user-123",
  "ip": "192.168.1.1",
  "path": "/dashboard",
  "authenticated": true,
  "rateLimit": {
    "remaining": 95,
    "limit": 100
  },
  "msg": "Request processed"
}
```

## 🔄 Rate Limiter em Memória

A implementação atual usa um `Map` em memória. Características:

- ✅ **Simples**: Sem dependências externas
- ✅ **Rápido**: Operações em O(1)
- ✅ **Auto-limpeza**: Remove registros expirados a cada 1 minuto
- ⚠️ **Limitação**: Não compartilha estado entre instâncias

### Migração para Produção

Para ambientes de produção com múltiplas instâncias, considere:

#### Opção 1: Redis
```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

export async function checkRateLimit(identifier: string) {
  const key = `rate-limit:${identifier}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, 60);
  }
  
  return {
    success: current <= 100,
    limit: 100,
    remaining: Math.max(0, 100 - current),
    reset: Date.now() + 60000,
  };
}
```

#### Opção 2: Upstash Rate Limit
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '60 s'),
});

export async function checkRateLimit(identifier: string) {
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);
  return { success, limit, remaining, reset };
}
```

## 🧪 Testando o Rate Limiting

### Teste Manual com cURL

```bash
# Fazer múltiplas requisições rapidamente
for i in {1..105}; do
  curl -i http://localhost:3000/dashboard
  echo "Request $i"
done
```

### Teste Programático

```typescript
import { checkRateLimit, resetRateLimit } from '@/lib/rateLimit';

// Resetar antes de testar
resetRateLimit('test-user');

// Fazer 101 requisições
for (let i = 0; i < 101; i++) {
  const result = checkRateLimit('test-user', { maxRequests: 100, windowSeconds: 60 });
  console.log(`Request ${i + 1}:`, result);
}
```

## 🔐 Segurança

### Extração de IP
O proxy tenta extrair o IP real do cliente usando:
1. `x-forwarded-for` header
2. `x-real-ip` header
3. Fallback para "unknown"

### Importante em Produção
Se estiver atrás de um proxy reverso (Nginx, Cloudflare, etc.), certifique-se de que:
- Os headers `X-Forwarded-For` ou `X-Real-IP` estão sendo definidos corretamente
- Você confia no proxy para definir esses headers
- Considere validar/sanitizar o IP extraído

## 📈 Monitoramento

Use os logs estruturados para monitorar:

```bash
# Ver todos os rate limits excedidos
pnpm dev | grep "Rate limit exceeded"

# Contar requisições por usuário
pnpm dev | grep "Request processed" | jq .userId | sort | uniq -c
```

## 🎭 Ambiente de Desenvolvimento

Em desenvolvimento, o logger usa `pino-pretty` para formatação colorida. Para alterar o nível de log:

```bash
# No arquivo .env
LOG_LEVEL=debug  # debug | info | warn | error
```

## 📚 Arquivos Relacionados

- [`src/proxy.ts`](file:///home/melquimartins/Documentos/Desenvolvimento/Next/next-typescript-starter/src/proxy.ts) - Middleware principal
- [`src/lib/rateLimit.ts`](file:///home/melquimartins/Documentos/Desenvolvimento/Next/next-typescript-starter/src/lib/rateLimit.ts) - Lógica de rate limiting
- [`src/lib/logger.ts`](file:///home/melquimartins/Documentos/Desenvolvimento/Next/next-typescript-starter/src/lib/logger.ts) - Configuração do logger

## 🚀 Próximos Passos

1. **Migrar para Redis** em produção para suporte multi-instância
2. **Adicionar whitelist** de IPs confiáveis que não sofrem rate limiting
3. **Implementar diferentes limites** por tipo de rota (API vs páginas)
4. **Adicionar métricas** com Prometheus ou similar
5. **Criar dashboard** de monitoramento de rate limiting
