import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

import { getEditorPreferences, updateEditorPreferences } from "@/lib/db/users";
import { DEFAULT_EDITOR_PREFERENCES } from "@/lib/editor-preferences";

const USER_ID = "usr_1";

const custom = {
  fontSize: 14,
  tabSize: 4,
  wordWrap: false,
  minimap: true,
  theme: "github-dark",
} as const;

describe("getEditorPreferences", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("reads the given user's row", async () => {
    prisma.user.findUnique.mockResolvedValue({ editorPreferences: custom });

    await expect(getEditorPreferences(USER_ID)).resolves.toEqual(custom);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: USER_ID },
      select: { editorPreferences: true },
    });
  });

  it("gives the defaults before anything has been saved", async () => {
    prisma.user.findUnique.mockResolvedValue({ editorPreferences: null });

    await expect(getEditorPreferences(USER_ID)).resolves.toEqual(
      DEFAULT_EDITOR_PREFERENCES,
    );
  });

  it("gives the defaults when the row is gone", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(getEditorPreferences(USER_ID)).resolves.toEqual(
      DEFAULT_EDITOR_PREFERENCES,
    );
  });
});

describe("updateEditorPreferences", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("writes the whole set to the given user's row only", async () => {
    prisma.user.update.mockResolvedValue({ editorPreferences: custom });

    await expect(updateEditorPreferences(USER_ID, custom)).resolves.toEqual(
      custom,
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { editorPreferences: custom },
      select: { editorPreferences: true },
    });
  });
});
