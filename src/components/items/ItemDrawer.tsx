"use client";

import { CalendarDays, File, Folder, Tag } from "lucide-react";

import { ItemDrawerActions } from "@/components/items/ItemDrawerActions";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { typeColorTint } from "@/lib/type-colors";
import { typeIcons } from "@/lib/type-icons";
import type { ItemDetail, ItemSummary } from "@/types/items";

interface ItemDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Card-level data, available the instant the card is clicked
  item: ItemSummary | null;
  // Fetched on open; null while in flight or after a failure
  detail: ItemDetail | null;
  error: string | null;
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon?: typeof Tag;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {title}
      </h3>
      {children}
    </section>
  );
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
}: ItemDrawerProps) {
  if (!item) return null;

  const Icon = typeIcons[item.type.icon] ?? File;
  const content = detail?.content ?? detail?.url ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
        // Nothing here describes the dialog as a whole; the sections do their
        // own labelling, and Radix warns unless the association is opted out of
        aria-describedby={undefined}
      >
        <SheetHeader className="gap-4 border-b p-6 pr-14">
          <div className="flex items-start gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-lg"
              // icon chip tinted with the item type's color
              style={{
                backgroundColor: typeColorTint(item.type.color, 10),
                color: item.type.color,
              }}
            >
              <Icon className="size-5" />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <SheetTitle className="text-lg leading-tight">
                {item.title}
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Type names are singular in the database; shown pluralized
                    here to match the sidebar and the listing headings */}
                <Badge variant="secondary">{item.type.name}s</Badge>
                {detail?.language && (
                  <Badge variant="outline">{detail.language}</Badge>
                )}
              </div>
            </div>
          </div>

          <ItemDrawerActions item={item} detail={detail} />
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
          {item.description && (
            <Section title="Description">
              <p className="text-sm">{item.description}</p>
            </Section>
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
              {content && (
                <Section title="Content">
                  <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                    {content}
                  </pre>
                </Section>
              )}

              {detail.fileName && (
                <Section title="File">
                  <p className="text-sm">
                    {detail.fileName}
                    {detail.fileSize !== null && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {formatFileSize(detail.fileSize)}
                      </span>
                    )}
                  </p>
                </Section>
              )}

              {item.tags.length > 0 && (
                <Section icon={Tag} title="Tags">
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </Section>
              )}

              {detail.collections.length > 0 && (
                <Section icon={Folder} title="Collections">
                  <div className="flex flex-wrap gap-1.5">
                    {detail.collections.map((collection) => (
                      <Badge key={collection.id} variant="outline">
                        {collection.name}
                      </Badge>
                    ))}
                  </div>
                </Section>
              )}

              <Section icon={CalendarDays} title="Details">
                <dl className="flex flex-col gap-1 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Created</dt>
                    <dd>{formatFullDate(detail.createdAt)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Updated</dt>
                    <dd>{formatFullDate(detail.updatedAt)}</dd>
                  </div>
                </dl>
              </Section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
