import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

// Neon suspends idle compute. The first query after that fails while the
// endpoint cold-starts — the serverless driver surfaces it as a bare
// ErrorEvent ({ type: "error" }), and Prisma reports unreachable as P1001.
// Retry only those transient connection failures so queries auto-recover.
const MAX_RETRIES = 4;
const BASE_DELAY_MS = 300;

function isTransientConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  // Neon WebSocket cold-start failure
  if ("type" in error && (error as { type?: unknown }).type === "error") {
    return true;
  }
  // Prisma "Can't reach database server"
  if ("code" in error && (error as { code?: unknown }).code === "P1001") {
    return true;
  }
  return false;
}

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function createPrismaClient() {
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL,
  });

  return new PrismaClient({ adapter }).$extends({
    query: {
      async $allOperations({ args, query }) {
        for (let attempt = 0; ; attempt++) {
          try {
            return await query(args);
          } catch (error) {
            if (attempt >= MAX_RETRIES || !isTransientConnectionError(error)) {
              throw error;
            }
            // Exponential backoff: 300, 600, 1200, 2400ms (~4.5s total)
            await sleep(BASE_DELAY_MS * 2 ** attempt);
          }
        }
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma?: ExtendedPrismaClient;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Reuse the client across hot reloads in dev to avoid exhausting connections
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
