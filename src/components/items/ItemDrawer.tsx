"use client";

import { Folder, Tag } from "lucide-react";

import { DrawerSection } from "@/components/items/DrawerSection";
import { ItemContentSection } from "@/components/items/ItemContentSection";
import { ItemDetailsSection } from "@/components/items/ItemDetailsSection";
import { ItemDrawerActions } from "@/components/items/ItemDrawerActions";
import { ItemEditForm } from "@/components/items/ItemEditForm";
import { ItemFileSection } from "@/components/items/ItemFileSection";
import { ItemSheetHeading } from "@/components/items/ItemSheetHeading";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { isCodeType } from "@/lib/code-language";
import type { CollectionOption } from "@/types/collections";
import type { ItemDetail, ItemFlags, ItemSummary } from "@/types/items";

interface ItemDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Card-level data, available the instant the card is clicked
  item: ItemSummary | null;
  // Fetched on open; null while in flight or after a failure
  detail: ItemDetail | null;
  error: string | null;
  // Replaces the drawer's copy of the item after a save, so the header and the
  // detail sections repaint without a second fetch
  onUpdated: (updated: ItemDetail) => void;
  onDeleted: () => void;
  onFlagsChange: (id: string, flags: ItemFlags) => void;
  // Edit mode is owned by the provider: it's the only place that knows when a
  // different item is opened, and resetting it from an effect here would mean
  // a setState during render
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  collectionOptions: CollectionOption[];
}

/**
 * The item detail view. There is no item page — this drawer is it.
 *
 * The header and tags render from the summary the listing page already had, so
 * the drawer is populated the moment it opens; only the sections that need the
 * fetch (content, collections, timestamps) show a skeleton.
 */
export function ItemDrawer({
  open,
  onOpenChange,
  item,
  detail,
  error,
  onUpdated,
  onDeleted,
  onFlagsChange,
  editing,
  onEditingChange,
  collectionOptions,
}: ItemDrawerProps) {
  if (!item) return null;

  // The code editor's own header shows the language, so the badge would repeat it
  const showLanguageBadge = Boolean(
    detail?.language && !(detail.content && isCodeType(item.type.name)),
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
        // Nothing here describes the dialog as a whole; the sections do their
        // own labelling, and Radix warns unless the association is opted out of
        aria-describedby={undefined}
      >
        {editing && detail ? (
          <ItemEditForm
            detail={detail}
            collections={collectionOptions}
            onCancel={() => onEditingChange(false)}
            onSaved={(updated) => {
              onEditingChange(false);
              onUpdated(updated);
            }}
          />
        ) : (
          <>
            <SheetHeader className="gap-4 border-b p-6 pr-14">
              <ItemSheetHeading type={item.type} title={item.title}>
                {showLanguageBadge && (
                  <Badge variant="outline">{detail?.language}</Badge>
                )}
              </ItemSheetHeading>

              {/* Keyed so a favorite or pin save still in flight for the previous item
                  can't repaint or block this item's buttons */}
              <ItemDrawerActions
                key={item.id}
                item={item}
                detail={detail}
                onEdit={() => onEditingChange(true)}
                onDeleted={onDeleted}
                onFlagsChange={onFlagsChange}
              />
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
              {item.description && (
                <DrawerSection title="Description">
                  <p className="text-sm">{item.description}</p>
                </DrawerSection>
              )}

              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : !detail ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                <>
                  <ItemContentSection detail={detail} />
                  <ItemFileSection detail={detail} />

                  {item.tags.length > 0 && (
                    <DrawerSection icon={Tag} title="Tags">
                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </DrawerSection>
                  )}

                  {detail.collections.length > 0 && (
                    <DrawerSection icon={Folder} title="Collections">
                      <div className="flex flex-wrap gap-1.5">
                        {detail.collections.map((collection) => (
                          <Badge key={collection.id} variant="outline">
                            {collection.name}
                          </Badge>
                        ))}
                      </div>
                    </DrawerSection>
                  )}

                  <ItemDetailsSection detail={detail} />
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
