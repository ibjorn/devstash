import type { Metadata } from "next";
import Link from "next/link";

import { auth } from "@/auth";
import { AiSection } from "@/components/homepage/AiSection";
import { Container } from "@/components/homepage/Container";
import { CtaSection } from "@/components/homepage/CtaSection";
import { FeaturesSection } from "@/components/homepage/FeaturesSection";
import { Hero } from "@/components/homepage/Hero";
import { HomeFooter } from "@/components/homepage/HomeFooter";
import { HomeNav } from "@/components/homepage/HomeNav";
import { Logo } from "@/components/homepage/Logo";
import { PricingSection } from "@/components/homepage/PricingSection";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "DevStash — Your developer knowledge, in one place",
  description:
    "One fast, searchable, AI-enhanced hub for your snippets, prompts, commands, notes, files, images and links.",
};

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

const NAV_BUTTON = "h-9.5 rounded-[10px] px-3 font-semibold sm:px-4";

function NavActions({ signedIn }: { signedIn: boolean }) {
  if (signedIn) {
    return (
      <Link href="/dashboard" className={cn(buttonVariants(), NAV_BUTTON)}>
        Dashboard
      </Link>
    );
  }
  return (
    <>
      <Link
        href="/sign-in"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          NAV_BUTTON,
          "text-muted-foreground",
        )}
      >
        Sign In
      </Link>
      <Link href="/register" className={cn(buttonVariants(), NAV_BUTTON)}>
        Get Started
      </Link>
    </>
  );
}

// Public marketing page: deliberately not in the proxy matcher. The session is
// read only to swap the sign-up buttons for a way back to the dashboard.
export default async function Home() {
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const primaryHref = signedIn ? "/dashboard" : "/register";

  return (
    <div data-homepage className="flex-1 overflow-x-hidden">
      <HomeNav>
        <Container className="flex h-16 items-center gap-8">
          <Logo />
          <nav
            aria-label="Primary"
            className="hidden gap-6 text-sm text-muted-foreground md:flex"
          >
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="transition-colors hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex gap-2">
            <NavActions signedIn={signedIn} />
          </div>
        </Container>
      </HomeNav>

      <main id="top">
        <Hero
          primaryHref={primaryHref}
          primaryLabel={signedIn ? "Go to your dashboard" : "Start for free"}
        />
        <FeaturesSection />
        <AiSection />
        <PricingSection />
        <CtaSection
          href={primaryHref}
          label={signedIn ? "Go to your dashboard" : "Create your free stash"}
        />
      </main>

      <HomeFooter />
    </div>
  );
}
