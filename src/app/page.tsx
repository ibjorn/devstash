import type { Metadata } from "next";

import { auth } from "@/auth";
import { AiSection } from "@/components/homepage/AiSection";
import { CtaSection } from "@/components/homepage/CtaSection";
import { FeaturesSection } from "@/components/homepage/FeaturesSection";
import { Hero } from "@/components/homepage/Hero";
import { HomeFooter } from "@/components/homepage/HomeFooter";
import { PricingSection } from "@/components/homepage/PricingSection";
import { SiteNav } from "@/components/homepage/SiteNav";

export const metadata: Metadata = {
  title: "DevStash — Your developer knowledge, in one place",
  description:
    "One fast, searchable, AI-enhanced hub for your snippets, prompts, commands, notes, files, images and links.",
};

// Public marketing page: deliberately not in the proxy matcher. The session is
// read only to swap the sign-up buttons for a way back to the dashboard.
export default async function Home() {
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const primaryHref = signedIn ? "/dashboard" : "/register";

  return (
    <div data-homepage className="flex-1 overflow-x-hidden">
      <SiteNav signedIn={signedIn} onHomepage />

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
