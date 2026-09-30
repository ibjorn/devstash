"use client";

import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateItem } from "@/actions/items";
import {
  ItemFormFields,
  visibleFieldsFor,
} from "@/components/items/ItemFormFields";
import { ItemSheetHeading } from "@/components/items/ItemSheetHeading";
import { Button } from "@/components/ui/button";
import { SheetHeader } from "@/components/ui/sheet";
import { useItemForm } from "@/hooks/use-item-form";
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

  const { values, handleChange, fieldErrors, pending, submit } = useItemForm({
    title: detail.title,
    description: detail.description ?? "",
    content: detail.content ?? "",
    language: detail.language ?? "",
    url: detail.url ?? "",
    tags: detail.tags.join(", "),
  });

  const visible = visibleFieldsFor(detail.contentType, detail.type.name);

  const canSave = values.title.trim().length > 0 && !pending;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    const saved = await submit(
      () =>
        updateItem(detail.id, {
          title: values.title,
          description: values.description,
          content: visible.content ? values.content : detail.content,
          language: visible.language ? values.language : detail.language,
          url: visible.url ? values.url : detail.url,
          tags: parseTagInput(values.tags),
        }),
      {
        unreachable:
          "Could not reach the server — your changes were not saved.",
        failed: "Could not save your changes.",
      },
    );
    if (!saved) return;

    toast.success("Item saved");
    onSaved(saved);
    // The cards behind the drawer are server-rendered, so they only pick the
    // change up on a refresh
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="gap-4 border-b p-6 pr-14">
        {/* Type is not editable */}
        <ItemSheetHeading type={detail.type} title="Edit item" />

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
