import { type NextRequest, NextResponse } from "next/server";
import { cleanupOrphanedImages } from "@/lib/jobs/cleanupOrphanedImages";
import logger from "@/lib/logger";

// Proteção com token secreto (pode usar Vercel Cron ou GitHub Actions)
const CRON_SECRET =
  process.env.CRON_SECRET || "dev-secret-change-in-production";

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (token !== CRON_SECRET) {
      logger.warn("Unauthorized cron attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Executar cleanup
    const result = await cleanupOrphanedImages(1); // 1 hora

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logger.error({ error }, "Error in cleanup cron job");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Permitir GET também (para testes manuais em dev)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  return POST(request);
}
