import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ItemTagListProps {
  tags: string[];
  className?: string;
}

/** An item's tags as badges. Renders nothing when there are none. */
export function ItemTagList({ tags, className }: ItemTagListProps) {
  if (tags.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary">
          {tag}
        </Badge>
      ))}
    </div>
  );
}
