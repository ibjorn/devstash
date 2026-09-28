"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ItemContentType } from "@/generated/prisma/client";

export interface ItemFormValues {
  title: string;
  description: string;
  content: string;
  language: string;
  url: string;
  tags: string;
}

export interface VisibleFields {
  content: boolean;
  language: boolean;
  url: boolean;
}

// Which system types carry a language. This only decides what the form
// *offers*; the server's rule is contentType-based, so a custom text type is
// still allowed one — it just isn't asked for here.
const LANGUAGE_TYPE_NAMES = new Set(["Snippet", "Command"]);

/** The optional fields a type's form renders, beyond title/description/tags. */
export function visibleFieldsFor(
  contentType: ItemContentType,
  typeName: string,
): VisibleFields {
  const content = contentType === "TEXT";
  return {
    content,
    language: content && LANGUAGE_TYPE_NAMES.has(typeName),
    url: contentType === "URL",
  };
}

interface ItemFormFieldsProps {
  values: ItemFormValues;
  onChange: (field: keyof ItemFormValues, value: string) => void;
  errors: Record<string, string>;
  visible: VisibleFields;
  tagsHint: string;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  );
}

// Ties an input to its error text for screen readers, the way the auth forms
// and the profile dialogs already do
function errorProps(field: string, errors: Record<string, string>) {
  return {
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
  };
}

/**
 * The item fields shared by the New Item dialog and the drawer's edit mode, so
 * the two forms can't drift apart. Controlled: the parent owns the values and
 * decides which optional fields a type shows.
 */
export function ItemFormFields({
  values,
  onChange,
  errors,
  visible,
  tagsHint,
}: ItemFormFieldsProps) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="item-title">Title</Label>
        <Input
          id="item-title"
          name="title"
          value={values.title}
          onChange={(event) => onChange("title", event.target.value)}
          {...errorProps("title", errors)}
          autoFocus
        />
        <FieldError id="title-error" message={errors.title} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="item-description">Description</Label>
        <Textarea
          id="item-description"
          name="description"
          value={values.description}
          onChange={(event) => onChange("description", event.target.value)}
          {...errorProps("description", errors)}
          rows={2}
        />
        <FieldError id="description-error" message={errors.description} />
      </div>

      {visible.content && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="item-content">Content</Label>
          <Textarea
            id="item-content"
            name="content"
            value={values.content}
            onChange={(event) => onChange("content", event.target.value)}
            {...errorProps("content", errors)}
            className="min-h-48 font-mono text-xs leading-relaxed"
          />
          <FieldError id="content-error" message={errors.content} />
        </div>
      )}

      {visible.url && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="item-url">URL</Label>
          <Input
            id="item-url"
            name="url"
            value={values.url}
            onChange={(event) => onChange("url", event.target.value)}
            {...errorProps("url", errors)}
            inputMode="url"
            placeholder="https://"
          />
          <FieldError id="url-error" message={errors.url} />
        </div>
      )}

      {visible.language && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="item-language">Language</Label>
          <Input
            id="item-language"
            name="language"
            value={values.language}
            onChange={(event) => onChange("language", event.target.value)}
            {...errorProps("language", errors)}
          />
          <FieldError id="language-error" message={errors.language} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="item-tags">Tags</Label>
        <Input
          id="item-tags"
          name="tags"
          value={values.tags}
          onChange={(event) => onChange("tags", event.target.value)}
          {...errorProps("tags", errors)}
          placeholder="react, hooks, typescript"
        />
        <p className="text-xs text-muted-foreground">{tagsHint}</p>
        <FieldError id="tags-error" message={errors.tags} />
      </div>
    </>
  );
}
