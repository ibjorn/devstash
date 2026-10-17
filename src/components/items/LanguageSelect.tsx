"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LANGUAGE_OPTIONS,
  languageOptionFor,
  PLAIN_TEXT,
} from "@/lib/code-language";

interface LanguageSelectProps {
  id: string;
  /** The item's free-text language, as stored. */
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
}

/**
 * The code types' language dropdown. Picking an option switches the editor's
 * highlighting straight away. A stored alias selects its option without being
 * rewritten, and a language the list doesn't know is offered as-is, so only an
 * actual pick changes what gets saved.
 */
export function LanguageSelect({
  id,
  value,
  onChange,
  invalid = false,
  describedBy,
}: LanguageSelectProps) {
  const selected = languageOptionFor(value);
  const isCustom =
    selected !== PLAIN_TEXT &&
    !LANGUAGE_OPTIONS.some((option) => option.value === selected);

  return (
    <Select
      value={selected}
      // Plain text is stored as no language at all
      onValueChange={(next) => onChange(next === PLAIN_TEXT ? "" : next)}
    >
      <SelectTrigger
        id={id}
        className="w-full sm:w-56"
        aria-invalid={invalid}
        aria-describedby={describedBy}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={PLAIN_TEXT}>Plain text</SelectItem>
        {isCustom && <SelectItem value={selected}>{selected}</SelectItem>}
        {LANGUAGE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
