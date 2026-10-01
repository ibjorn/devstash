import { AppShell } from "@/components/dashboard/AppShell";

// Render per request — sidebar and favorites come from the database
export const dynamic = "force-dynamic";

export default function FavoritesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
