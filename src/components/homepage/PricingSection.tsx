import Link from "next/link";

import { FreePlanPrice } from "@/components/billing/PlanPrice";
import { PriceCard } from "@/components/billing/PriceCard";
import {
  FREE_FEATURES,
  PRO_FEATURES,
} from "@/components/billing/plan-features";
import { buttonVariants } from "@/components/ui/button";
import { getZarToUsdRate } from "@/lib/exchange-rate";
import { cn } from "@/lib/utils";

import { Container } from "./Container";
import { BillingToggle, PricingToggle, ProPrice } from "./PricingToggle";
import { Reveal } from "./Reveal";
import { SectionHeader } from "./shared";

interface PricingTier {
  name: string;
  price: React.ReactNode;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
}

// "Go Pro" goes to /upgrade; the proxy sends a signed-out visitor
// through sign-in first and back again
function tiers(usdRate: number | null): PricingTier[] {
  return [
    {
      name: "Free",
      price: <FreePlanPrice />,
      features: FREE_FEATURES,
      cta: "Get started",
      href: "/register",
    },
    {
      name: "Pro",
      price: <ProPrice usdRate={usdRate} />,
      features: PRO_FEATURES,
      cta: "Go Pro",
      href: "/upgrade",
      featured: true,
    },
  ];
}

function TierCard({ cta, href, ...tier }: PricingTier) {
  return (
    <PriceCard {...tier}>
      <Link
        href={href}
        className={cn(
          buttonVariants({ variant: tier.featured ? "default" : "outline" }),
          "h-9.5 w-full rounded-[10px] font-semibold",
        )}
      >
        {cta}
      </Link>
    </PriceCard>
  );
}

export async function PricingSection() {
  // Fails soft to null, and the prices fall back to rand
  const usdRate = await getZarToUsdRate();

  return (
    <section id="pricing" className="scroll-mt-20 py-20 md:py-28">
      <Container>
        <Reveal>
          <SectionHeader
            eyebrow="Pricing"
            title="Start free. Upgrade when your stash outgrows it."
          />
        </Reveal>
        <PricingToggle>
          <Reveal>
            <BillingToggle />
          </Reveal>
          <div className="grid justify-center gap-6 md:grid-cols-[repeat(2,minmax(0,380px))]">
            {tiers(usdRate).map((tier) => (
              <Reveal key={tier.name}>
                <TierCard {...tier} />
              </Reveal>
            ))}
          </div>
        </PricingToggle>
      </Container>
    </section>
  );
}
