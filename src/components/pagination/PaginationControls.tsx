import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { pageHref, pageLinks } from "@/lib/pagination";
import { cn } from "@/lib/utils";

interface PaginationControlsProps {
  // The listing's path without a query string, e.g. "/items/snippets"
  basePath: string;
  page: number;
  totalPages: number;
}

interface StepLinkProps {
  href: string | null;
  label: string;
  children: React.ReactNode;
}

// Prev/next: a link while there is somewhere to go, otherwise a greyed-out
// span — a disabled <a> would still be focusable and followable. The span
// takes role="link" so its aria-label is announced; on a plain span it's
// ignored, which below sm (where the text is hidden) would leave it silent.
function StepLink({ href, label, children }: StepLinkProps) {
  const className = cn(buttonVariants({ variant: "ghost" }), "gap-1 px-2.5");

  if (!href) {
    return (
      <span
        role="link"
        aria-disabled="true"
        aria-label={label}
        className={cn(className, "pointer-events-none opacity-50")}
      >
        {children}
      </span>
    );
  }

  return (
    <Link href={href} aria-label={label} className={className}>
      {children}
    </Link>
  );
}

export function PaginationControls({
  basePath,
  page,
  totalPages,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <StepLink
            href={page > 1 ? pageHref(basePath, page - 1) : null}
            label="Go to previous page"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:block">Previous</span>
          </StepLink>
        </PaginationItem>

        {pageLinks(page, totalPages).map((link, index) => (
          <PaginationItem key={link === "ellipsis" ? `gap-${index}` : link}>
            {link === "ellipsis" ? (
              <PaginationEllipsis />
            ) : (
              <Link
                href={pageHref(basePath, link)}
                aria-label={`Page ${link}`}
                aria-current={link === page ? "page" : undefined}
                className={buttonVariants({
                  variant: link === page ? "outline" : "ghost",
                  size: "icon",
                })}
              >
                {link}
              </Link>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <StepLink
            href={page < totalPages ? pageHref(basePath, page + 1) : null}
            label="Go to next page"
          >
            <span className="hidden sm:block">Next</span>
            <ChevronRight className="size-4" />
          </StepLink>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
