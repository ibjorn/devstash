import { Check } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The large primary CTA used in the hero and the closing CTA. */
export const CTA_LARGE = cn(
  buttonVariants(),
  "h-12 rounded-[10px] px-6 text-base font-semibold",
);

/** Shared section heading size (features, AI, pricing, CTA). */
export const SECTION_TITLE =
  "my-3.5 text-[clamp(1.8rem,3.5vw,2.6rem)] leading-[1.15] font-extrabold tracking-tight";

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

export function GradientText({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-linear-90 from-blue-500 via-violet-500 to-pink-500 bg-clip-text text-transparent">
      {children}
    </span>
  );
}

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
}: SectionHeaderProps) {
  return (
    <header className="mx-auto mb-14 max-w-160 text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className={SECTION_TITLE}>{title}</h2>
      {description && (
        <p className="text-[1.05rem] text-muted-foreground">{description}</p>
      )}
    </header>
  );
}

/** Green-ticked feature list (AI section and pricing cards). */
export function Checklist({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  return (
    <ul className={cn("grid gap-3", className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-2.75 text-zinc-300">
          <span
            aria-hidden
            className="mt-0.75 grid size-4.75 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-500"
          >
            <Check className="size-2.75" strokeWidth={3} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}
