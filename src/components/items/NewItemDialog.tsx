"use client";

import { Loader2, Lock, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { createItem } from "@/actions/items";
import { FileUpload, type UploadedFile } from "@/components/items/FileUpload";
import { useItemDrawer } from "@/components/items/ItemDrawerProvider";
import {
  ItemFormFields,
  type ItemFormValues,
  visibleFieldsFor,
} from "@/components/items/ItemFormFields";
import { ItemTypePicker } from "@/components/items/ItemTypePicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useItemForm } from "@/hooks/use-item-form";
import { uploadKindFor } from "@/lib/uploads";
import { parseTagInput } from "@/lib/validation/items";
import type { CollectionOption } from "@/types/collections";
import type { NewItemTypeOption } from "@/types/items";

interface NewItemDialogProps {
  types: NewItemTypeOption[];
  collections: CollectionOption[];
}

const EMPTY_VALUES: ItemFormValues = {
  title: "",
  description: "",
  content: "",
  language: "",
  url: "",
  tags: "",
  collectionIds: [],
};

// On /items/[slug], start on that page's type; anywhere else, the first one
function initialTypeId(
  types: NewItemTypeOption[],
  pathname: string,
): string | undefined {
  const match = /^\/items\/([^/]+)/.exec(pathname);
  if (match) {
    const slug = decodeURIComponent(match[1]).toLowerCase();
    const fromPage = types.find((type) => type.slug === slug);
    if (fromPage) return fromPage.id;
  }
  return types[0]?.id;
}

// Shown in place of the upload field for a Pro-only type on a Free account
function LockedTypeNote({
  typeName,
  onUpgrade,
}: {
  typeName: string;
  onUpgrade: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border p-3 text-sm">
      <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <p className="text-muted-foreground">
        {typeName} items are a Pro feature.{" "}
        <Link
          href="/upgrade"
          onClick={onUpgrade}
          className="font-medium text-foreground underline underline-offset-4"
        >
          Upgrade
        </Link>{" "}
        to upload files and images.
      </p>
    </div>
  );
}

/**
 * The top bar's New Item button and the dialog it opens. On success the new
 * item opens in the drawer, which is why this has to sit inside the
 * ItemDrawerProvider AppShell renders.
 */
export function NewItemDialog({ types, collections }: NewItemDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { openItem } = useItemDrawer();

  const [open, setOpen] = useState(false);
  // For the Upgrade link and toast action: the shell, and this dialog with
  // it, stays mounted on /settings
  const closeDialog = useCallback(() => setOpen(false), []);
  const [typeId, setTypeId] = useState<string | undefined>(types[0]?.id);
  const { values, handleChange, reset, fieldErrors, pending, submit } =
    useItemForm(EMPTY_VALUES, closeDialog);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);

  const type = types.find((candidate) => candidate.id === typeId);
  const locked = type?.locked ?? false;
  const uploadKind = type && !locked ? uploadKindFor(type.name) : null;
  const visible = type
    ? visibleFieldsFor(type.contentType, type.name)
    : {
        content: false,
        code: false,
        markdown: false,
        language: false,
        url: false,
      };

  const canSave =
    Boolean(type) &&
    !locked &&
    values.title.trim().length > 0 &&
    (!visible.url || values.url.trim().length > 0) &&
    (!uploadKind || file !== null) &&
    !uploading &&
    !pending;

  function handleOpenChange(next: boolean) {
    // A request still in flight is going to land either way; closing would
    // only hide its outcome. An upload in flight is simply abandoned.
    if (pending) return;
    if (next) {
      // Every open starts fresh, on the type of the page it was opened from
      setTypeId(initialTypeId(types, pathname));
      reset(EMPTY_VALUES);
      setFile(null);
      setUploading(false);
    }
    setOpen(next);
  }

  function handleTypeChange(nextTypeId: string) {
    // An upload is only valid for the kind it was made for
    if (nextTypeId !== typeId) setFile(null);
    setTypeId(nextTypeId);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || !type) return;

    const created = await submit(
      () =>
        createItem({
          itemTypeId: type.id,
          title: values.title,
          description: values.description,
          // Fields this type doesn't show are sent empty, whatever was typed
          // into them under a previously selected type
          content: visible.content ? values.content : null,
          language: visible.language ? values.language : null,
          url: visible.url ? values.url : null,
          tags: parseTagInput(values.tags),
          collectionIds: values.collectionIds,
          fileKey: uploadKind ? (file?.key ?? null) : null,
        }),
      {
        unreachable: "Could not reach the server — the item was not created.",
        failed: "Could not create this item.",
      },
    );
    if (!created) return;

    setOpen(false);
    toast.success(`Created "${created.title}"`);
    openItem(created, created);
    // Cards, sidebar counts and stats are server-rendered
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          {/* Icon-only until lg: from md the docked sidebar takes 256px of the
            top bar, so the labels don't fit at tablet widths either */}
          <span className="sr-only lg:not-sr-only">New Item</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>New item</DialogTitle>
            <DialogDescription>
              Save a snippet, prompt, command, note, file, image or link to your
              stash.
            </DialogDescription>
          </DialogHeader>

          <ItemTypePicker
            types={types}
            value={typeId}
            onChange={handleTypeChange}
            disabled={uploading}
          />

          {locked && type && (
            <LockedTypeNote typeName={type.name} onUpgrade={closeDialog} />
          )}

          {uploadKind && type && (
            <div className="flex flex-col gap-2">
              <Label asChild>
                <span>{uploadKind === "image" ? "Image" : "File"}</span>
              </Label>
              <FileUpload
                key={type.id}
                itemTypeId={type.id}
                kind={uploadKind}
                value={file}
                onChange={setFile}
                onUploadingChange={setUploading}
                error={fieldErrors.file}
                onUpgrade={closeDialog}
              />
            </div>
          )}

          <ItemFormFields
            values={values}
            onChange={handleChange}
            errors={fieldErrors}
            visible={visible}
            tagsHint="Separate tags with commas."
            collections={collections}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
