import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

interface FavoriteStarProps {
  /** Filled yellow when on; a plain outline when off. */
  active?: boolean;
  className?: string;
}

/** The star that marks a favorite, wherever one is shown or toggled. */
export function FavoriteStar({ active = true, className }: FavoriteStarProps) {
  return (
    <Star
      className={cn(active && "fill-yellow-400 text-yellow-400", className)}
    />
  );
}
