"use client";

import { FolderPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  type CollectionActionResult,
  createCollection,
} from "@/actions/collections";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Ties an input to its error text for screen readers
function errorProps(field: string, errors: Record<string, string>) {
  return {
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? `collection-${field}-error` : undefined,
  };
}

function FieldError({ field, message }: { field: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`collection-${field}-error`} className="text-xs text-destructive">
      {message}
    </p>
  );
}

/** The top bar's New Collection button and the dialog it opens. */
export function NewCollectionDialog() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const canSave = name.trim().length > 0 && !pending;

  function handleOpenChange(next: boolean) {
    // A request in flight is going to land either way; closing would only
    // hide its outcome
    if (pending) return;
    if (next) {
      setName("");
      setDescription("");
      setFieldErrors({});
    }
    setOpen(next);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    setPending(true);
    setFieldErrors({});

    // Only the action call is inside the try, so a throw in the success
    // handling below can't be reported as "not created"
    let result: CollectionActionResult;
    try {
      result = await createCollection({ name, description });
    } catch {
      toast.error(
        "Could not reach the server — the collection was not created.",
      );
      return;
    } finally {
      setPending(false);
    }

    if (!result.success || !result.data) {
      setFieldErrors(result.fieldErrors ?? {});
      if (result.error) {
        toast.error(result.error);
      } else if (!result.fieldErrors) {
        toast.error("Could not create this collection.");
      }
      return;
    }

    setOpen(false);
    toast.success(`Created "${result.data.name}"`);
    // The collections grid, stats and sidebar are server-rendered
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FolderPlus className="size-4" />
          {/* Icon-only on narrow screens, where the top bar is crowded */}
          <span className="sr-only sm:not-sr-only">New Collection</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>New collection</DialogTitle>
            <DialogDescription>
              Group related items together. An item can belong to more than one
              collection.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="collection-name">Name</Label>
            <Input
              id="collection-name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              {...errorProps("name", fieldErrors)}
              autoFocus
            />
            <FieldError field="name" message={fieldErrors.name} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="collection-description">Description</Label>
            <Textarea
              id="collection-description"
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              {...errorProps("description", fieldErrors)}
              rows={3}
            />
            <FieldError field="description" message={fieldErrors.description} />
          </div>

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
