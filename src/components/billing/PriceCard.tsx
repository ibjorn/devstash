import { Checklist } from "@/components/homepage/shared";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PriceCardProps {
  name: string;
  price: React.ReactNode;
  features: string[];
  featured?: boolean;
  /** The card's call to action, pinned to the bottom. */
  children: React.ReactNode;
}

/** A plan card — the homepage pricing section and /upgrade. */
export function PriceCard({
  name,
  price,
  features,
  featured,
  children,
}: PriceCardProps) {
  return (
    <Card
      className={cn(
        "relative h-full gap-0 overflow-visible rounded-[14px] p-8 ring-white/8",
        featured &&
          "bg-linear-to-b from-violet-500/10 to-card to-45% shadow-[0_0_80px_-30px_rgb(139_92_246/0.6)] ring-violet-500/55",
      )}
    >
      {featured && (
        <Badge className="absolute -top-3 left-1/2 h-auto -translate-x-1/2 bg-linear-90 from-blue-500 to-violet-500 px-2.5 py-1 text-[0.72rem] font-semibold tracking-[0.06em] text-white uppercase">
          Most Popular
        </Badge>
      )}
      <h3 className="text-[1.15rem] font-bold tracking-tight">{name}</h3>
      {price}
      <Checklist items={features} className="mb-8 flex-1 content-start" />
      {children}
    </Card>
  );
}
