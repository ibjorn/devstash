"use client";

import { useId } from "react";

import { useEditorPreferences } from "@/components/editor/EditorPreferencesProvider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  EDITOR_THEME_LABELS,
  EDITOR_THEMES,
  FONT_SIZES,
  TAB_SIZES,
  type EditorPreferences,
  type EditorTheme,
} from "@/lib/editor-preferences";

interface PreferenceRowProps {
  id: string;
  label: string;
  description: string;
  children: React.ReactNode;
}

function PreferenceRow({
  id,
  label,
  description,
  children,
}: PreferenceRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

/**
 * Editor preferences, saved as each one changes — there is no save button.
 * The provider applies the change to open editors at once and toasts the save.
 */
export function EditorPreferencesForm() {
  const { preferences, updatePreferences } = useEditorPreferences();
  const id = useId();

  // Radix Select works in strings; the options are fixed lists, so parsing
  // back can't produce anything the server would refuse
  function selectNumber(key: "fontSize" | "tabSize") {
    return (value: string) =>
      updatePreferences({ [key]: Number(value) } as Partial<EditorPreferences>);
  }

  return (
    <div className="divide-y">
      <PreferenceRow
        id={`${id}-font-size`}
        label="Font size"
        description="Text size in the code editor."
      >
        <Select
          value={String(preferences.fontSize)}
          onValueChange={selectNumber("fontSize")}
        >
          <SelectTrigger id={`${id}-font-size`} className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}px
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PreferenceRow>

      <PreferenceRow
        id={`${id}-tab-size`}
        label="Tab size"
        description="Spaces inserted when you press Tab."
      >
        <Select
          value={String(preferences.tabSize)}
          onValueChange={selectNumber("tabSize")}
        >
          <SelectTrigger id={`${id}-tab-size`} className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TAB_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} spaces
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PreferenceRow>

      <PreferenceRow
        id={`${id}-theme`}
        label="Theme"
        description="Colour scheme for code."
      >
        <Select
          value={preferences.theme}
          onValueChange={(value) =>
            updatePreferences({ theme: value as EditorTheme })
          }
        >
          <SelectTrigger id={`${id}-theme`} className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EDITOR_THEMES.map((theme) => (
              <SelectItem key={theme} value={theme}>
                {EDITOR_THEME_LABELS[theme]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PreferenceRow>

      <PreferenceRow
        id={`${id}-word-wrap`}
        label="Word wrap"
        description="Wrap long lines instead of scrolling sideways."
      >
        <Switch
          id={`${id}-word-wrap`}
          checked={preferences.wordWrap}
          onCheckedChange={(checked) =>
            updatePreferences({ wordWrap: checked })
          }
        />
      </PreferenceRow>

      <PreferenceRow
        id={`${id}-minimap`}
        label="Minimap"
        description="Show a zoomed-out overview of the code beside it."
      >
        <Switch
          id={`${id}-minimap`}
          checked={preferences.minimap}
          onCheckedChange={(checked) => updatePreferences({ minimap: checked })}
        />
      </PreferenceRow>
    </div>
  );
}
