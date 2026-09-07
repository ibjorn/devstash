"use client";

import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { type ItemActionResult, updateItem } from "@/actions/items";
import { ItemTypeIcon } from "@/components/items/ItemTypeIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { parseTagInput } from "@/lib/validation/items";
import type { ItemDetail } from "@/types/items";

interface ItemEditFormProps {
  detail: ItemDetail;
  onCancel: () => void;
  onSaved: (updated: ItemDetail) => void;
}

// Which system types carry a language. This only decides what the form
// *offers*; the server's rule is contentType-based, so a custom text type is
// still allowed one — it just isn't asked for here.
const LANGUAGE_TYPE_NAMES = new Set(["Snippet", "Command"]);

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
 * Edit mode for the item drawer. The `<form>` wraps the header as well as the
 * fields so Save and Cancel can sit in the action bar's place and still be
 * ordinary submit/reset buttons rather than remote-controlled ones.
 *
 * Fields the form doesn't render send back the value the item already had, so
 * editing a Note can never blank a column the form never showed.
 */
export function ItemEditForm({ detail, onCancel, onSaved }: ItemEditFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(detail.title);
  const [description, setDescription] = useState(detail.description ?? "");
  const [content, setContent] = useState(detail.content ?? "");
  const [language, setLanguage] = useState(detail.language ?? "");
  const [url, setUrl] = useState(detail.url ?? "");
  const [tags, setTags] = useState(detail.tags.join(", "));

  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const showsContent = detail.contentType === "TEXT";
  const showsUrl = detail.contentType === "URL";
  const showsLanguage =
    showsContent && LANGUAGE_TYPE_NAMES.has(detail.type.name);

  const canSave = title.trim().length > 0 && !pending;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    setPending(true);
    setFieldErrors({});

    // Only the call itself is guarded. Anything after a successful save sits
    // outside, so a throw on the way back can't report a save that worked as
    // "your changes were not saved".
    let result: ItemActionResult;
    try {
      result = await updateItem(detail.id, {
        title,
        description,
        content: showsContent ? content : detail.content,
        language: showsLanguage ? language : detail.language,
        url: showsUrl ? url : detail.url,
        tags: parseTagInput(tags),
      });
    } catch {
      toast.error("Could not reach the server — your changes were not saved.");
      return;
    } finally {
      setPending(false);
    }

    if (!result.success || !result.data) {
      setFieldErrors(result.fieldErrors ?? {});
      // Field messages render beside their input, so a validation failure needs
      // no toast — only a failure with no field to blame does
      if (result.error) {
        toast.error(result.error);
      } else if (!result.fieldErrors) {
        toast.error("Could not save your changes.");
      }
      return;
    }

    toast.success("Item saved");
    onSaved(result.data);
    // The cards behind the drawer are server-rendered, so they only pick the
    // change up on a refresh
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="gap-4 border-b p-6 pr-14">
        <div className="flex items-start gap-3">
          <ItemTypeIcon type={detail.type} />
          <div className="flex min-w-0 flex-col gap-2">
            <SheetTitle className="text-lg leading-tight">Edit item</SheetTitle>
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Type is not editable */}
              <Badge variant="secondary">{detail.type.name}s</Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={pending}
          >
            <X className="size-4" />
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!canSave}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </div>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="item-title">Title</Label>
          <Input
            id="item-title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            {...errorProps("title", fieldErrors)}
            autoFocus
          />
          <FieldError id="title-error" message={fieldErrors.title} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="item-description">Description</Label>
          <Textarea
            id="item-description"
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            {...errorProps("description", fieldErrors)}
            rows={2}
          />
          <FieldError
            id="description-error"
            message={fieldErrors.description}
          />
        </div>

        {showsContent && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="item-content">Content</Label>
            <Textarea
              id="item-content"
              name="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              {...errorProps("content", fieldErrors)}
              className="min-h-48 font-mono text-xs leading-relaxed"
            />
            <FieldError id="content-error" message={fieldErrors.content} />
          </div>
        )}

        {showsUrl && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="item-url">URL</Label>
            <Input
              id="item-url"
              name="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              {...errorProps("url", fieldErrors)}
              inputMode="url"
            />
            <FieldError id="url-error" message={fieldErrors.url} />
          </div>
        )}

        {showsLanguage && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="item-language">Language</Label>
            <Input
              id="item-language"
              name="language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              {...errorProps("language", fieldErrors)}
            />
            <FieldError id="language-error" message={fieldErrors.language} />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="item-tags">Tags</Label>
          <Input
            id="item-tags"
            name="tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            {...errorProps("tags", fieldErrors)}
            placeholder="react, hooks, typescript"
          />
          <p className="text-xs text-muted-foreground">
            Separate tags with commas. Clearing this removes every tag.
          </p>
          <FieldError id="tags-error" message={fieldErrors.tags} />
        </div>
      </div>
    </form>
  );
}
