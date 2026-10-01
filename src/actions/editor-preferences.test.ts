import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, updateEditorPreferencesQuery } = vi.hoisted(() => ({
  auth: vi.fn(),
  updateEditorPreferencesQuery: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/db/users", () => ({
  updateEditorPreferences: updateEditorPreferencesQuery,
}));

import { updateEditorPreferences } from "@/actions/editor-preferences";

const USER_ID = "usr_1";

const preferences = {
  fontSize: 16,
  tabSize: 4,
  wordWrap: false,
  minimap: true,
  theme: "monokai",
};

describe("updateEditorPreferences", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("refuses a signed-out caller without reaching the database", async () => {
    auth.mockResolvedValue(null);

    const result = await updateEditorPreferences(preferences);

    expect(result.success).toBe(false);
    expect(updateEditorPreferencesQuery).not.toHaveBeenCalled();
  });

  it("saves for the session user, ignoring a userId in the input", async () => {
    auth.mockResolvedValue({ user: { id: USER_ID } });
    updateEditorPreferencesQuery.mockResolvedValue(preferences);

    const result = await updateEditorPreferences({
      ...preferences,
      userId: "usr_other",
    });

    expect(result).toEqual({ success: true, data: preferences });
    expect(updateEditorPreferencesQuery).toHaveBeenCalledWith(
      USER_ID,
      preferences,
    );
  });

  it("refuses invalid input without reaching the database", async () => {
    auth.mockResolvedValue({ user: { id: USER_ID } });

    const result = await updateEditorPreferences({
      ...preferences,
      fontSize: 99,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(updateEditorPreferencesQuery).not.toHaveBeenCalled();
  });

  it("returns a generic error when the write fails", async () => {
    auth.mockResolvedValue({ user: { id: USER_ID } });
    updateEditorPreferencesQuery.mockRejectedValue(new Error("db down"));

    const result = await updateEditorPreferences(preferences);

    expect(result).toEqual({
      success: false,
      error: "Could not save editor preferences.",
    });
  });
});
