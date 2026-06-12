import { Folder, FolderHeart, Layers, Star, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { DashboardStats } from "@/types/dashboard";

interface StatsCardsProps {
  stats: DashboardStats;
}

interface Stat {
  label: string;
  value: number;
  icon: LucideIcon;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards: Stat[] = [
    { label: "Items", value: stats.items, icon: Layers },
    { label: "Collections", value: stats.collections, icon: Folder },
    { label: "Favorite Items", value: stats.favoriteItems, icon: Star },
    {
      label: "Favorite Collections",
      value: stats.favoriteCollections,
      icon: FolderHeart,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-semibold">{stat.value}</p>
            </div>
            <stat.icon className="size-4 shrink-0 text-muted-foreground" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
