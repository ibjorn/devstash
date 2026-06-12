import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // CLI operations (migrate, introspect) must use the direct Neon
    // connection; the pooled URL is for the app at runtime.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
