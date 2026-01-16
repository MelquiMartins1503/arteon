import { jwtVerify } from "jose";
import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import { checkRateLimit } from "@/lib/rateLimit";

const publicRoutes = [
  { path: "/sign-in", whenAuthenticated: "redirect" },
  { path: "/sign-up", whenAuthenticated: "redirect" },
  { path: "/forgot-password", whenAuthenticated: "redirect" },
  { path: "/reset-password", whenAuthenticated: "redirect" },
  { path: "/nada", whenAuthenticated: "next" },
] as const;

const REDIRECT_WHEN_AUTHENTICATED = "/";

// Configuração de rate limiting
const RATE_LIMIT_CONFIG = {
  maxRequests: 100, // 100 requisições
  windowSeconds: 60, // por minuto
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const accessToken = request.cookies.get("accessToken")?.value;
  const clientIp =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Codifica a chave secreta para o formato que o jose espera
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

  let isAuthenticated = false;
  let userId: string | undefined;

  // 1. Verificar o token JWT
  // NOTA: Verificação de existência do usuário é feita em getAuthenticatedUser() nas APIs
  // Middleware roda no Edge Runtime que não suporta Prisma/database
  if (accessToken) {
    try {
      const { payload } = await jwtVerify(accessToken, secret);
      isAuthenticated = true;
      userId = payload.id?.toString() || (payload.sub as string | undefined);

      logger.debug({ userId, path, ip: clientIp }, "Authenticated request");
    } catch (err) {
      // Token inválido ou expirado. Consideramos não autenticado.
      isAuthenticated = false;
      logger.warn({ err, path, ip: clientIp }, "Invalid or expired token");
    }
  }

  // 2. Aplicar Rate Limiting
  // Usa userId se autenticado, caso contrário usa IP
  const rateLimitIdentifier = userId || clientIp;
  const rateLimitResult = checkRateLimit(
    rateLimitIdentifier,
    RATE_LIMIT_CONFIG,
  );

  // Se excedeu o rate limit, retorna 429 Too Many Requests
  if (!rateLimitResult.success) {
    logger.warn(
      {
        identifier: rateLimitIdentifier,
        userId,
        ip: clientIp,
        path,
        limit: rateLimitResult.limit,
        reset: rateLimitResult.reset,
      },
      "Rate limit exceeded",
    );

    const response = NextResponse.json(
      {
        error: "Too Many Requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
      },
      { status: 429 },
    );

    // Adiciona headers informativos
    response.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
    response.headers.set("X-RateLimit-Remaining", "0");
    response.headers.set("X-RateLimit-Reset", rateLimitResult.reset.toString());
    response.headers.set(
      "Retry-After",
      Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
    );

    return response;
  }

  // 3. Log apenas situações relevantes ao invés de todas as requisições
  // Para economizar em custos de logging e melhorar performance
  const isNearRateLimit = rateLimitResult.remaining < 10;
  const isAuthIssue = accessToken && !isAuthenticated;

  if (isNearRateLimit || isAuthIssue) {
    logger.warn(
      {
        userId,
        ip: clientIp,
        path,
        authenticated: isAuthenticated,
        rateLimit: {
          remaining: rateLimitResult.remaining,
          limit: rateLimitResult.limit,
        },
      },
      isNearRateLimit
        ? "Rate limit próximo do threshold"
        : "Token inválido detectado",
    );
  }

  const publicRoute = publicRoutes.find((route) => path.startsWith(route.path));

  // 4. Lógica de Redirecionamento

  // Se o usuário ESTÁ autenticado e tenta acessar uma rota pública, mas não acessível
  if (isAuthenticated && publicRoute?.whenAuthenticated === "redirect") {
    logger.debug(
      { userId, path },
      "Redirecting authenticated user from public route",
    );

    return NextResponse.redirect(
      new URL(REDIRECT_WHEN_AUTHENTICATED, request.url),
    );
  }

  // Se o usuário NÃO ESTÁ autenticado e a rota NÃO É pública
  if (!isAuthenticated && !publicRoute) {
    logger.debug(
      { ip: clientIp, path },
      "Redirecting unauthenticated user to sign-in",
    );

    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // 5. Caso contrário, permite o acesso e adiciona headers de rate limit
  const response = NextResponse.next();

  response.headers.set("X-RateLimit-Limit", rateLimitResult.limit.toString());
  response.headers.set(
    "X-RateLimit-Remaining",
    rateLimitResult.remaining.toString(),
  );
  response.headers.set("X-RateLimit-Reset", rateLimitResult.reset.toString());

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
