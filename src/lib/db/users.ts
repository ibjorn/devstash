import {
  parseEditorPreferences,
  type EditorPreferences,
} from "@/lib/editor-preferences";
import { prisma } from "@/lib/prisma";
import type { CurrentUser, ProfileUser } from "@/types/users";

// Returns null when the session's user id has no row — the session is a JWT,
// so it stays syntactically valid after the user is deleted. Callers must
// treat null as "stale session" rather than letting it throw.
export async function getCurrentUser(
  userId: string
): Promise<CurrentUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, image: true },
  });
}

// Profile view of the signed-in user. Returns null on a stale session for the
// same reason getCurrentUser does.
export async function getProfileUser(
  userId: string
): Promise<ProfileUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      image: true,
      createdAt: true,
      password: true,
    },
  });
  if (!user) return null;

  // The hash is reduced to a boolean here and never leaves this function
  return {
    name: user.name,
    email: user.email,
    image: user.image,
    createdAt: user.createdAt,
    hasPassword: user.password !== null,
  };
}

// Always a complete set: a user who has never changed anything (or whose row
// is gone) gets the defaults rather than null
export async function getEditorPreferences(
  userId: string
): Promise<EditorPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { editorPreferences: true },
  });
  return parseEditorPreferences(user?.editorPreferences);
}

// Replaces the whole object. `preferences` must already be validated — the
// column is JSON, so nothing below this line would refuse an unknown key.
export async function updateEditorPreferences(
  userId: string,
  preferences: EditorPreferences
): Promise<EditorPreferences> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { editorPreferences: preferences },
    select: { editorPreferences: true },
  });
  return parseEditorPreferences(user.editorPreferences);
}
