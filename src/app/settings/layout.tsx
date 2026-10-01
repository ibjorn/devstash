import { AppShell } from "@/components/dashboard/AppShell";

// Render per request — sidebar types and collections come from the database
export const dynamic = "force-dynamic";

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
