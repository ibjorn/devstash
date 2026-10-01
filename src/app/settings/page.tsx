import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ChangePasswordDialog } from "@/components/profile/ChangePasswordDialog";
import { DeleteAccountDialog } from "@/components/profile/DeleteAccountDialog";
import { SetPasswordButton } from "@/components/profile/SetPasswordButton";
import { EditorPreferencesForm } from "@/components/settings/EditorPreferencesForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardStats } from "@/lib/db/dashboard";
import { requireUserId } from "@/lib/db/session-user";
import { getProfileUser } from "@/lib/db/users";

export const metadata: Metadata = {
  title: "Settings · DevStash",
};

// Render per request — everything here comes from the database
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const [user, stats] = await Promise.all([
    getProfileUser(userId),
    getDashboardStats(userId),
  ]);

  // Same stale-JWT case the shell handles; repeated here because this page
  // runs its own query rather than reading the layout's
  if (!user) redirect("/api/auth/session-expired");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your editor, how you sign in and your account
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Editor</h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Code editor</CardTitle>
            <CardDescription>
              Applies to snippets and commands. Notes and prompts use the
              Markdown editor. Changes save automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EditorPreferencesForm />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Account</h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Password</CardTitle>
            <CardDescription>
              {user.hasPassword
                ? "Change the password you use to sign in with your email address."
                : "You sign in with GitHub. Add a password to also sign in with your email address."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user.hasPassword ? (
              <ChangePasswordDialog />
            ) : (
              <SetPasswordButton email={user.email} />
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Delete account</CardTitle>
            <CardDescription>
              Permanently removes your account and everything in it. This cannot
              be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAccountDialog
              email={user.email}
              itemCount={stats.items}
              collectionCount={stats.collections}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
