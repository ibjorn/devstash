"use client";

import { File, Loader2, Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { createItem, type ItemActionResult } from "@/actions/items";
import { useItemDrawer } from "@/components/items/ItemDrawerProvider";
import {
  ItemFormFields,
  type ItemFormValues,
  visibleFieldsFor,
} from "@/components/items/ItemFormFields";
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
import { cn } from "@/lib/utils";
import { typeColorTint } from "@/lib/type-colors";
import { typeIcons } from "@/lib/type-icons";
import { parseTagInput } from "@/lib/validation/items";
import type { CreatableItemType } from "@/types/items";

interface NewItemDialogProps {
  types: CreatableItemType[];
}

const EMPTY_VALUES: ItemFormValues = {
  title: "",
  description: "",
  content: "",
  language: "",
  url: "",
  tags: "",
};

// On /items/[slug], start on that page's type; anywhere else, the first one
function initialTypeId(
  types: CreatableItemType[],
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

/**
 * The top bar's New Item button and the dialog it opens. On success the new
 * item opens in the drawer, which is why this has to sit inside the
 * ItemDrawerProvider AppShell renders.
 */
export function NewItemDialog({ types }: NewItemDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { openItem } = useItemDrawer();

  const [open, setOpen] = useState(false);
  const [typeId, setTypeId] = useState<string | undefined>(types[0]?.id);
  const [values, setValues] = useState<ItemFormValues>(EMPTY_VALUES);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const type = types.find((candidate) => candidate.id === typeId);
  const visible = type
    ? visibleFieldsFor(type.contentType, type.name)
    : { content: false, code: false, language: false, url: false };

  const canSave =
    Boolean(type) &&
    values.title.trim().length > 0 &&
    (!visible.url || values.url.trim().length > 0) &&
    !pending;

  function handleOpenChange(next: boolean) {
    // A request still in flight is going to land either way; closing would
    // only hide its outcome
    if (pending) return;
    if (next) {
      // Every open starts fresh, on the type of the page it was opened from
      setTypeId(initialTypeId(types, pathname));
      setValues(EMPTY_VALUES);
      setFieldErrors({});
    }
    setOpen(next);
  }

  function handleChange(field: keyof ItemFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || !type) return;

    setPending(true);
    setFieldErrors({});

    // Only the call itself is guarded, so a throw after a successful create
    // can't be reported as "not created"
    let result: ItemActionResult;
    try {
      result = await createItem({
        itemTypeId: type.id,
        title: values.title,
        description: values.description,
        // Fields this type doesn't show are sent empty, whatever was typed
        // into them under a previously selected type
        content: visible.content ? values.content : null,
        language: visible.language ? values.language : null,
        url: visible.url ? values.url : null,
        tags: parseTagInput(values.tags),
      });
    } catch {
      toast.error("Could not reach the server — the item was not created.");
      return;
    } finally {
      setPending(false);
    }

    if (!result.success || !result.data) {
      setFieldErrors(result.fieldErrors ?? {});
      // Field messages render beside their input; only a failure with no
      // field to blame is toasted
      if (result.error) {
        toast.error(result.error);
      } else if (!result.fieldErrors) {
        toast.error("Could not create this item.");
      }
      return;
    }

    setOpen(false);
    toast.success(`Created "${result.data.title}"`);
    openItem(result.data, result.data);
    // Cards, sidebar counts and stats are server-rendered
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          New Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>New item</DialogTitle>
            <DialogDescription>
              Save a snippet, prompt, command, note or link to your stash.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label id="new-item-type-label">Type</Label>
            <div
              role="group"
              aria-labelledby="new-item-type-label"
              className="flex flex-wrap gap-2"
            >
              {types.map((option) => {
                const Icon = typeIcons[option.icon] ?? File;
                const selected = option.id === typeId;
                return (
                  <Button
                    key={option.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-pressed={selected}
                    onClick={() => setTypeId(option.id)}
                    className={cn(!selected && "text-muted-foreground")}
                    style={
                      selected
                        ? {
                            borderColor: option.color,
                            backgroundColor: typeColorTint(option.color, 10),
                          }
                        : undefined
                    }
                  >
                    <Icon className="size-4" style={{ color: option.color }} />
                    {option.name}
                  </Button>
                );
              })}
            </div>
          </div>

          <ItemFormFields
            values={values}
            onChange={handleChange}
            errors={fieldErrors}
            visible={visible}
            tagsHint="Separate tags with commas."
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
