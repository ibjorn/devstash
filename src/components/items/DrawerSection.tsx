import type { LucideIcon } from "lucide-react";

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
