import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

interface DrawerSectionProps {
  icon?: LucideIcon;
  title: string;
  children: React.ReactNode;
}

/** A labelled block in the item drawer's body. */
export function DrawerSection({
  icon: Icon,
  title,
  children,
}: DrawerSectionProps) {
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

interface BadgeListSectionProps {
  icon: LucideIcon;
  title: string;
  badges: { key: string; label: string }[];
  variant: "secondary" | "outline";
}

/** A drawer section of badges — the item's tags or its collections. */
export function BadgeListSection({
  icon,
  title,
  badges,
  variant,
}: BadgeListSectionProps) {
  if (badges.length === 0) return null;
  return (
    <DrawerSection icon={icon} title={title}>
      <div className="flex flex-wrap gap-1.5">
        {badges.map((badge) => (
          <Badge key={badge.key} variant={variant}>
            {badge.label}
          </Badge>
        ))}
      </div>
    </DrawerSection>
  );
}
