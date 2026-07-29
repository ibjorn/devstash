import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { CurrentUser } from "@/types/users";

// "Brad Traversy" -> "BT". Falls back to the email for a null or blank name —
// `||` rather than `??` because GitHub can hand back an empty display name.
export function getUserInitials(user: CurrentUser) {
  return (user.name || user.email)
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface UserAvatarProps {
  user: CurrentUser;
  className?: string;
}

// AvatarImage renders a plain <img>, so remote GitHub avatars need no
// next.config image host allowlist.
export function UserAvatar({ user, className }: UserAvatarProps) {
  return (
    <Avatar className={cn("size-8", className)}>
      {user.image && <AvatarImage src={user.image} alt="" />}
      <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
    </Avatar>
  );
}
