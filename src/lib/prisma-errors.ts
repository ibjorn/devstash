import { Prisma } from "@/generated/prisma/client";

/**
 * Whether `error` is a Prisma known-request error with this code — e.g. P2025
 * (record not found, which is also what an ownership-scoped where clause
 * raises for someone else's row) or P2002 (unique constraint).
 */
export function isPrismaError(
  error: unknown,
  code: string,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}
