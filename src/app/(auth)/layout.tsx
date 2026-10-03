import { auth } from "@/auth";
import { SiteNav } from "@/components/homepage/SiteNav";

// Reads the session only for the nav: reset-password deliberately serves
// signed-in visitors, who should see "Dashboard" rather than "Sign In".
export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <>
      <SiteNav signedIn={Boolean(session?.user)} />
      {/* pt-22: the fixed 64px nav plus the p-6 gutter the card had before */}
      <main className="flex flex-1 items-center justify-center px-6 pt-22 pb-6">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </>
  );
}
