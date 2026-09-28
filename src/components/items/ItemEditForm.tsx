"use client";

import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { type ItemActionResult, updateItem } from "@/actions/items";
import { ItemTypeIcon } from "@/components/items/ItemTypeIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ItemFormFields,
  type ItemFormValues,
  visibleFieldsFor,
} from "@/components/items/ItemFormFields";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { parseTagInput } from "@/lib/validation/items";
import type { ItemDetail } from "@/types/items";

interface ItemEditFormProps {
  detail: ItemDetail;
  onCancel: () => void;
  onSaved: (updated: ItemDetail) => void;
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

  const [values, setValues] = useState<ItemFormValues>({
    title: detail.title,
    description: detail.description ?? "",
    content: detail.content ?? "",
    language: detail.language ?? "",
    url: detail.url ?? "",
    tags: detail.tags.join(", "),
  });

  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const visible = visibleFieldsFor(detail.contentType, detail.type.name);

  const canSave = values.title.trim().length > 0 && !pending;

  function handleChange(field: keyof ItemFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

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
        title: values.title,
        description: values.description,
        content: visible.content ? values.content : detail.content,
        language: visible.language ? values.language : detail.language,
        url: visible.url ? values.url : detail.url,
        tags: parseTagInput(values.tags),
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
        <ItemFormFields
          values={values}
          onChange={handleChange}
          errors={fieldErrors}
          visible={visible}
          tagsHint="Separate tags with commas. Clearing this removes every tag."
        />
      </div>
    </form>
  );
}
