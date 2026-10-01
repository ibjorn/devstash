import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ItemTypeBreakdown } from "@/components/profile/ItemTypeBreakdown";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { getDashboardStats } from "@/lib/db/dashboard";
import { getItemTypeNavItems } from "@/lib/db/item-types";
import { requireUserId } from "@/lib/db/session-user";
import { getProfileUser } from "@/lib/db/users";

export const metadata: Metadata = {
  title: "Profile · DevStash",
};

// Render per request — everything here comes from the database
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const userId = await requireUserId();
  const [user, stats, itemTypes] = await Promise.all([
    getProfileUser(userId),
    getDashboardStats(userId),
    getItemTypeNavItems(userId),
  ]);

  // Same stale-JWT case the shell handles; repeated here because this page
  // runs its own query rather than reading the layout's
  if (!user) redirect("/api/auth/session-expired");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your account details and what you have stashed
        </p>
      </div>

      <ProfileHeader user={user} />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Usage</h2>
        <StatsCards stats={stats} />
        <ItemTypeBreakdown itemTypes={itemTypes} />
      </section>
    </div>
  );
}
