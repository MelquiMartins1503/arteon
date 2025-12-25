import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const global = globalThis as unknown as { prismaGlobal: PrismaClient };

const prismaClient = global.prismaGlobal ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prismaClient;
}

export default prismaClient;
