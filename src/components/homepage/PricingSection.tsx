import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { Container } from "./Container";
import { BillingToggle, PricingToggle, ProPrice } from "./PricingToggle";
import { Reveal } from "./Reveal";
import { Checklist, SectionHeader } from "./shared";

interface PricingTier {
  name: string;
  price: React.ReactNode;
  features: string[];
  cta: string;
  featured?: boolean;
}

const FREE_PRICE = (
  <>
    <p className="mt-4 mb-2 flex items-baseline gap-2">
      <span className="text-[2.8rem] font-extrabold tracking-[-0.03em]">
        $0
      </span>
      <span className="text-muted-foreground">forever</span>
    </p>
    <p className="mb-6 min-h-[1.6em] text-[0.92rem] text-muted-foreground">
      Everything you need to get your stash started.
    </p>
  </>
);

// "Go Pro" leads to registration until Stripe checkout exists
const TIERS: PricingTier[] = [
  {
    name: "Free",
    price: FREE_PRICE,
    features: [
      "50 items",
      "3 collections",
      "Snippets, prompts, commands, notes & links",
      "Basic search",
    ],
    cta: "Get started",
  },
  {
    name: "Pro",
    price: <ProPrice />,
    features: [
      "Unlimited items & collections",
      "File & image uploads",
      "AI tagging, summaries & explanations",
      "Prompt optimizer",
      "Full search & data export",
    ],
    cta: "Go Pro",
    featured: true,
  },
];

function PriceCard({ name, price, features, cta, featured }: PricingTier) {
  return (
    <Card
      className={cn(
        "relative h-full gap-0 overflow-visible rounded-[14px] p-8 ring-white/8",
        featured &&
          "bg-linear-to-b from-violet-500/10 to-card to-45% shadow-[0_0_80px_-30px_rgb(139_92_246/0.6)] ring-violet-500/55",
      )}
    >
      {featured && (
        <Badge className="absolute -top-3 left-1/2 h-auto -translate-x-1/2 bg-linear-90 from-blue-500 to-violet-500 px-2.5 py-1 text-[0.72rem] font-semibold tracking-[0.06em] text-white uppercase">
          Most Popular
        </Badge>
      )}
      <h3 className="text-[1.15rem] font-bold tracking-tight">{name}</h3>
      {price}
      <Checklist items={features} className="mb-8 flex-1 content-start" />
      <Link
        href="/register"
        className={cn(
          buttonVariants({ variant: featured ? "default" : "outline" }),
          "h-9.5 w-full rounded-[10px] font-semibold",
        )}
      >
        {cta}
      </Link>
    </Card>
  );
}

export function PricingSection() {
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
            {TIERS.map((tier) => (
              <Reveal key={tier.name}>
                <PriceCard {...tier} />
              </Reveal>
            ))}
          </div>
        </PricingToggle>
      </Container>
    </section>
  );
}
