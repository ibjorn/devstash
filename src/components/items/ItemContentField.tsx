"use client";

import {
  errorIdFor,
  fieldErrorProps,
  FormField,
} from "@/components/forms/FormField";
import { Textarea } from "@/components/ui/textarea";

import { CodeEditor } from "./CodeEditor";
import type { VisibleFields } from "./ItemFormFields";
import { MarkdownEditor } from "./MarkdownEditor";

const CONTENT_ID = "item-content";

interface ItemContentFieldProps {
  value: string;
  /** The item's language, for the code editor's highlighting. */
  language: string;
  onChange: (value: string) => void;
  error?: string;
  visible: VisibleFields;
}

/**
 * The item forms' Content field, in whichever editor the type uses: Monaco
 * for code, the Markdown editor for notes and prompts, a plain textarea for
 * the rest. Renders nothing for types without text content.
 */
export function ItemContentField({
  value,
  language,
  onChange,
  error,
  visible,
}: ItemContentFieldProps) {
  if (!visible.content) return null;

  if (visible.code) {
    return (
      // Monaco's input isn't a labellable element; it takes an ariaLabel
      // option instead, so this label is visual only
      <FormField id={CONTENT_ID} label="Content" error={error} visualLabel>
        <CodeEditor
          value={value}
          language={language}
          onChange={onChange}
          ariaLabel="Content"
          invalid={Boolean(error)}
        />
      </FormField>
    );
  }

  if (visible.markdown) {
    return (
      <FormField id={CONTENT_ID} label="Content" error={error}>
        <MarkdownEditor
          id={CONTENT_ID}
          value={value}
          onChange={onChange}
          invalid={Boolean(error)}
          describedBy={error ? errorIdFor(CONTENT_ID) : undefined}
        />
      </FormField>
    );
  }

  return (
    <FormField id={CONTENT_ID} label="Content" error={error}>
      <Textarea
        id={CONTENT_ID}
        name="content"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...fieldErrorProps(CONTENT_ID, error)}
        className="min-h-48 font-mono text-xs leading-relaxed"
      />
    </FormField>
  );
}
