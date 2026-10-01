"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { updateEditorPreferences } from "@/actions/editor-preferences";
import type { EditorPreferences } from "@/lib/editor-preferences";

interface EditorPreferencesContextValue {
  preferences: EditorPreferences;
  /** Applies a change immediately and saves it; reverts if the save fails. */
  updatePreferences: (change: Partial<EditorPreferences>) => void;
}

export const EditorPreferencesContext =
  createContext<EditorPreferencesContextValue | null>(null);

/**
 * The signed-in user's editor preferences. Throws outside a provider rather
 * than falling back to defaults — an editor silently ignoring the user's
 * settings is a bug that would otherwise ship quietly.
 */
export function useEditorPreferences(): EditorPreferencesContextValue {
  const context = useContext(EditorPreferencesContext);
  if (!context) {
    throw new Error(
      "useEditorPreferences must be used inside an EditorPreferencesProvider",
    );
  }

  return context;
}

// One id, so a run of quick changes replaces the toast rather than stacking
const TOAST_ID = "editor-preferences";

/**
 * Holds the preferences for the signed-in shell, so a change on the settings
 * page reaches every open editor without a reload. Saves are optimistic: the
 * editors update at once, and only a failed save rolls them back.
 */
export function EditorPreferencesProvider({
  children,
  initialPreferences,
}: {
  children: React.ReactNode;
  initialPreferences: EditorPreferences;
}) {
  const [preferences, setPreferences] = useState(initialPreferences);
  // Read by updatePreferences so two changes in one tick build on each other
  const current = useRef(initialPreferences);
  // The last value the server confirmed — what a failed save reverts to
  const saved = useRef(initialPreferences);
  const latestRequest = useRef(0);

  const updatePreferences = useCallback(
    async (change: Partial<EditorPreferences>) => {
      const next = { ...current.current, ...change };
      current.current = next;
      setPreferences(next);
      const request = ++latestRequest.current;

      let result;
      try {
        result = await updateEditorPreferences(next);
      } catch {
        result = {
          success: false,
          error: "Could not reach the server. Your change was not saved.",
        };
      }

      if (result.success && result.data) saved.current = result.data;
      // A newer change is on its way; let its outcome speak instead
      if (request !== latestRequest.current) return;

      if (result.success) {
        toast.success("Editor preferences saved", { id: TOAST_ID });
        return;
      }

      current.current = saved.current;
      setPreferences(saved.current);
      toast.error(result.error ?? "Could not save editor preferences.", {
        id: TOAST_ID,
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      preferences,
      updatePreferences: (change: Partial<EditorPreferences>) => {
        void updatePreferences(change);
      },
    }),
    [preferences, updatePreferences],
  );

  return (
    <EditorPreferencesContext.Provider value={value}>
      {children}
    </EditorPreferencesContext.Provider>
  );
}
