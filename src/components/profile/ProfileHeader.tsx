import { CalendarDays, KeyRound, Mail } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/user/UserAvatar";
import type { ProfileUser } from "@/types/users";

interface ProfileHeaderProps {
  user: ProfileUser;
}

// Fixed locale rather than the visitor's: this renders on the server, so
// leaving it to the runtime would produce a different string than the client
// and trip a hydration mismatch.
const joinedFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function ProfileHeader({ user }: ProfileHeaderProps) {
  // `||` not `??` — an empty GitHub display name should fall through to email
  const displayName = user.name || user.email;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <UserAvatar user={user} className="size-16 text-lg" />
        <div className="min-w-0 space-y-1">
          <h2 className="truncate text-xl font-semibold">{displayName}</h2>
          <dl className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:gap-4">
            <div className="flex items-center gap-2">
              <dt className="sr-only">Email</dt>
              <Mail className="size-4 shrink-0" aria-hidden />
              <dd className="truncate">{user.email}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">Joined</dt>
              <CalendarDays className="size-4 shrink-0" aria-hidden />
              <dd>Joined {joinedFormatter.format(user.createdAt)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">Sign-in method</dt>
              <KeyRound className="size-4 shrink-0" aria-hidden />
              <dd>{user.hasPassword ? "Email & password" : "GitHub"}</dd>
            </div>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}
