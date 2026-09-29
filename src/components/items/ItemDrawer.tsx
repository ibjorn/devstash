"use client";

import { CalendarDays, Download, Folder, Tag } from "lucide-react";

import { CodeEditor } from "@/components/items/CodeEditor";
import { ItemDrawerActions } from "@/components/items/ItemDrawerActions";
import { ItemEditForm } from "@/components/items/ItemEditForm";
import { ItemTypeIcon } from "@/components/items/ItemTypeIcon";
import { MarkdownEditor } from "@/components/items/MarkdownEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { isCodeType, isMarkdownType } from "@/lib/code-language";
import { formatBytes, uploadKindFor } from "@/lib/uploads";
import type { ItemDetail, ItemSummary } from "@/types/items";

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
  // Edit mode is owned by the provider: it's the only place that knows when a
  // different item is opened, and resetting it from an effect here would mean
  // a setState during render
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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
  onUpdated,
  onDeleted,
  editing,
  onEditingChange,
}: ItemDrawerProps) {
  if (!item) return null;

  const content = detail?.content ?? detail?.url ?? null;
  // Only real content goes in the editor; a link's URL fallback stays plain text
  const code = isCodeType(item.type.name) ? detail?.content : null;
  const markdown = isMarkdownType(item.type.name) ? detail?.content : null;
  const isImage = uploadKindFor(item.type.name) === "image";
  const fileHref = `/api/items/${encodeURIComponent(item.id)}/file`;

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
            onCancel={() => onEditingChange(false)}
            onSaved={(updated) => {
              onEditingChange(false);
              onUpdated(updated);
            }}
          />
        ) : (
          <>
            <SheetHeader className="gap-4 border-b p-6 pr-14">
              <div className="flex items-start gap-3">
                <ItemTypeIcon type={item.type} />
                <div className="flex min-w-0 flex-col gap-2">
                  <SheetTitle className="text-lg leading-tight">
                    {item.title}
                  </SheetTitle>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Type names are singular in the database; shown pluralized
                        here to match the sidebar and the listing headings */}
                    <Badge variant="secondary">{item.type.name}s</Badge>
                    {/* The code editor's own header shows the language */}
                    {detail?.language && !code && (
                      <Badge variant="outline">{detail.language}</Badge>
                    )}
                  </div>
                </div>
              </div>

              <ItemDrawerActions
                item={item}
                detail={detail}
                onEdit={() => onEditingChange(true)}
                onDeleted={onDeleted}
              />
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
                  {code ? (
                    <Section title="Content">
                      <CodeEditor
                        value={code}
                        language={detail.language}
                        readOnly
                        ariaLabel={`${item.title} (read-only)`}
                      />
                    </Section>
                  ) : markdown ? (
                    <Section title="Content">
                      <MarkdownEditor
                        value={markdown}
                        readOnly
                        ariaLabel={`${item.title} (rendered Markdown)`}
                      />
                    </Section>
                  ) : (
                    content && (
                      <Section title="Content">
                        <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                          {content}
                        </pre>
                      </Section>
                    )
                  )}

                  {detail.fileName && (
                    <Section title={isImage ? "Image" : "File"}>
                      {isImage && (
                        // Served by the authenticated proxy; next/image's
                        // optimiser fetches server-side without the session
                        // cookie, so it can't load it
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={fileHref}
                          alt={item.title}
                          className="max-h-96 w-full rounded-lg border bg-muted/40 object-contain"
                        />
                      )}
                      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3">
                        <p className="min-w-0 truncate text-sm">
                          {detail.fileName}
                          {detail.fileSize !== null && (
                            <span className="text-muted-foreground">
                              {" "}
                              · {formatBytes(detail.fileSize)}
                            </span>
                          )}
                        </p>
                        <Button variant="outline" size="sm" asChild>
                          <a href={`${fileHref}?download=1`} download>
                            <Download className="size-4" />
                            Download
                          </a>
                        </Button>
                      </div>
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
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
