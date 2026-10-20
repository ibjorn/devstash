"use client";

import { CollectionPicker } from "@/components/collections/CollectionPicker";
import {
  errorIdFor,
  fieldErrorProps,
  FormField,
} from "@/components/forms/FormField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ItemContentType } from "@/generated/prisma/client";
import { isCodeType, isMarkdownType } from "@/lib/code-language";
import { parseTagInput } from "@/lib/validation/items";
import type { CollectionOption } from "@/types/collections";

import { ItemContentField } from "./ItemContentField";
import { LanguageSelect } from "./LanguageSelect";
import { SuggestTags } from "./SuggestTags";
import { SummarizeDescription, type SummaryDraft } from "./SummarizeDescription";

export interface ItemFormValues {
  title: string;
  description: string;
  content: string;
  language: string;
  url: string;
  tags: string;
  collectionIds: string[];
}

export type ItemFormChange = <K extends keyof ItemFormValues>(
  field: K,
  value: ItemFormValues[K],
) => void;

export interface VisibleFields {
  content: boolean;
  /** Content is edited in the code editor rather than a plain textarea. */
  code: boolean;
  /** Content is edited in the Markdown editor with a preview tab. */
  markdown: boolean;
  language: boolean;
  url: boolean;
}

/** What a form shows before a type is chosen: none of the optional fields. */
export const NO_VISIBLE_FIELDS: VisibleFields = {
  content: false,
  code: false,
  markdown: false,
  language: false,
  url: false,
};

/** The optional fields a type's form renders, beyond title/description/tags. */
export function visibleFieldsFor(
  contentType: ItemContentType,
  typeName: string,
): VisibleFields {
  const content = contentType === "TEXT";
  const code = content && isCodeType(typeName);
  return {
    content,
    code,
    markdown: content && isMarkdownType(typeName),
    language: code,
    url: contentType === "URL",
  };
}

// What the AI buttons describe and tag from. A field this type doesn't show
// holds nothing worth sending, whatever was typed into it under another type.
function aiDraftFrom(
  values: ItemFormValues,
  visible: VisibleFields,
  typeName: string,
  fileName: string | undefined,
): SummaryDraft {
  return {
    typeName,
    title: values.title,
    content: visible.content ? values.content : "",
    language: visible.language ? values.language : "",
    url: visible.url ? values.url : "",
    fileName: fileName ?? "",
    tags: values.tags,
  };
}

interface ItemFormFieldsProps {
  values: ItemFormValues;
  onChange: ItemFormChange;
  errors: Record<string, string>;
  visible: VisibleFields;
  tagsHint: string;
  /** Every collection the user owns, for the collections picker. */
  collections: CollectionOption[];
  /**
   * The item's type name, for AI tag suggestions. Pass it only for Pro users —
   * omitted, the Suggest Tags and description buttons aren't rendered.
   */
  aiTypeName?: string;
  /** A file or image item's file name, for the AI description to go on. */
  fileName?: string;
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
  collections,
  aiTypeName,
  fileName,
}: ItemFormFieldsProps) {
  const draft = aiTypeName
    ? aiDraftFrom(values, visible, aiTypeName, fileName)
    : null;

  return (
    <>
      <FormField id="item-title" label="Title" error={errors.title}>
        <Input
          id="item-title"
          name="title"
          value={values.title}
          onChange={(event) => onChange("title", event.target.value)}
          {...fieldErrorProps("item-title", errors.title)}
          autoFocus
        />
      </FormField>

      <FormField
        id="item-description"
        label="Description"
        error={errors.description}
        labelAddon={
          draft && (
            <SummarizeDescription
              draft={draft}
              description={values.description}
              onChange={(description) => onChange("description", description)}
            />
          )
        }
      >
        <Textarea
          id="item-description"
          name="description"
          value={values.description}
          onChange={(event) => onChange("description", event.target.value)}
          {...fieldErrorProps("item-description", errors.description)}
          rows={2}
        />
      </FormField>

      {visible.language && (
        <FormField id="item-language" label="Language" error={errors.language}>
          <LanguageSelect
            id="item-language"
            value={values.language}
            onChange={(value) => onChange("language", value)}
            invalid={Boolean(errors.language)}
            describedBy={
              errors.language ? errorIdFor("item-language") : undefined
            }
          />
        </FormField>
      )}

      <ItemContentField
        value={values.content}
        language={values.language}
        onChange={(value) => onChange("content", value)}
        error={errors.content}
        visible={visible}
      />

      {visible.url && (
        <FormField id="item-url" label="URL" error={errors.url}>
          <Input
            id="item-url"
            name="url"
            value={values.url}
            onChange={(event) => onChange("url", event.target.value)}
            {...fieldErrorProps("item-url", errors.url)}
            inputMode="url"
            placeholder="https://"
          />
        </FormField>
      )}

      <FormField id="item-tags" label="Tags" error={errors.tags}>
        <Input
          id="item-tags"
          name="tags"
          value={values.tags}
          onChange={(event) => onChange("tags", event.target.value)}
          {...fieldErrorProps("item-tags", errors.tags)}
          placeholder="react, hooks, typescript"
        />
        {draft && (
          <SuggestTags
            draft={draft}
            tags={values.tags}
            onAccept={(tag) =>
              onChange("tags", [...parseTagInput(values.tags), tag].join(", "))
            }
          />
        )}
        <p className="text-xs text-muted-foreground">{tagsHint}</p>
      </FormField>

      <FormField
        id="item-collections"
        label="Collections"
        error={errors.collectionIds}
      >
        <CollectionPicker
          id="item-collections"
          options={collections}
          value={values.collectionIds}
          onChange={(value) => onChange("collectionIds", value)}
          invalid={Boolean(errors.collectionIds)}
          describedBy={
            errors.collectionIds ? errorIdFor("item-collections") : undefined
          }
        />
      </FormField>
    </>
  );
}
