import "dotenv/config";

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL as string,
    // @ts-expect-error - directUrl is supported by the runtime but missing from types in this version
    directUrl: process.env.DIRECT_URL as string,
  },
});
