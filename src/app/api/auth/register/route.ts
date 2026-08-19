import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation/auth";
import { issueVerificationEmail } from "@/lib/email/send-verification";

// Match the cost factor used by the seed script
const BCRYPT_ROUNDS = 12;

const EMAIL_TAKEN = "An account with that email already exists";

// Static segments win over the sibling [...nextauth] catch-all, so this owns
// POST /api/auth/register.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid registration details",
      },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: EMAIL_TAKEN },
        { status: 409 },
      );
    }

    const user = await prisma.user.create({
      data: { name, email, password: await bcrypt.hash(password, BCRYPT_ROUNDS) },
      select: { id: true, name: true, email: true },
    });

    // A send failure must not fail the request. The account exists and is
    // recoverable through the resend endpoint; rolling it back would leave the
    // user unable to register at all, and throwing here would strand the row.
    const sent = await issueVerificationEmail({
      email: user.email,
      name: user.name,
      userId: user.id,
    });
    if (!sent.success) {
      console.error("Verification email not sent for %s: %s", user.email, sent.error);
    }

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    // Two concurrent registrations can slip past the check above; the unique
    // index is the real guard
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, error: EMAIL_TAKEN },
        { status: 409 },
      );
    }

    console.error("Registration failed:", error);
    return NextResponse.json(
      { success: false, error: "Could not create account" },
      { status: 500 },
    );
  }
}
