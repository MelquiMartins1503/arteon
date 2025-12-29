import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import logger from "./logger";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const global = globalThis as unknown as {
  prismaGlobal: ReturnType<typeof createPrismaClient>;
};

function createPrismaClient() {
  return new PrismaClient({ adapter }).$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          const start = Date.now();
          const result = await query(args);
          const duration = Date.now() - start;

          // Log slow queries (> 1 second)
          if (duration > 1000) {
            logger.warn(
              {
                model,
                operation,
                duration,
                args: process.env.NODE_ENV === "development" ? args : undefined,
              },
              "Slow database query detected",
            );
          }

          // Log very slow queries as errors (> 3 seconds)
          if (duration > 3000) {
            logger.error(
              {
                model,
                operation,
                duration,
                args: process.env.NODE_ENV === "development" ? args : undefined,
              },
              "Critical: Very slow database query",
            );
          }

          return result;
        },
      },
    },
  });
}

const prismaClient = global.prismaGlobal ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prismaClient;
}

export default prismaClient;
