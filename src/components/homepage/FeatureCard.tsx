import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

export interface Feature {
  title: string;
  description: React.ReactNode;
  icon: LucideIcon;
  color: string;
}

export function FeatureCard({
  title,
  description,
  icon: Icon,
  color,
}: Feature) {
  return (
    <Card
      className="relative h-full gap-0 rounded-[14px] p-7 ring-white/8 transition-[translate,box-shadow] duration-250 hover:-translate-y-0.75 hover:ring-(--type-color)/45 motion-reduce:hover:translate-y-0"
      style={{ "--type-color": color } as React.CSSProperties}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5 bg-(--type-color) opacity-80"
      />
      <span
        aria-hidden
        className="mb-5 grid size-11 place-items-center rounded-[11px] bg-(--type-color)/14 text-(--type-color)"
      >
        <Icon className="size-5.5" />
      </span>
      <h3 className="mb-2 text-[1.1rem] font-bold tracking-tight">{title}</h3>
      <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
        {description}
      </p>
    </Card>
  );
}
