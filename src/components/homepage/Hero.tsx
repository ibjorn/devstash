import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ChaosAnimation } from "./ChaosAnimation";
import { Container } from "./Container";
import { DashboardPreview } from "./DashboardPreview";
import { Reveal } from "./Reveal";
import { CTA_LARGE, Eyebrow, GradientText } from "./shared";

interface HeroProps {
  primaryHref: string;
  primaryLabel: string;
}

function Panel({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "w-full max-w-xl rounded-[14px] border bg-card p-4 lg:max-w-none shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)]",
        className,
      )}
    >
      <p className="mb-3 font-mono text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

export function Hero({ primaryHref, primaryLabel }: HeroProps) {
  return (
    <section className="relative overflow-hidden pt-28 pb-18 md:pt-35 md:pb-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-[10%] h-75 w-150 rounded-full bg-blue-500/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[10%] h-75 w-125 rounded-full bg-violet-500/14 blur-3xl"
      />

      <Container className="relative">
        <Reveal className="mx-auto mb-16 max-w-195 text-center">
          <Eyebrow>For developers who keep losing that one snippet</Eyebrow>
          <h1 className="mt-4.5 mb-5 text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.15] font-extrabold tracking-[-0.035em]">
            Stop Losing Your
            <br />
            <GradientText>Developer Knowledge</GradientText>
          </h1>
          <p className="mx-auto max-w-155 text-[1.12rem] leading-relaxed text-muted-foreground">
            Your snippets live in VS Code, your prompts in old chats, your
            commands in bash history and your links in a hundred browser tabs.
            DevStash pulls them into one fast, searchable hub.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={primaryHref} className={CTA_LARGE}>
              {primaryLabel}
            </Link>
            <a
              href="#features"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-12 rounded-[10px] px-6 text-base font-semibold",
              )}
            >
              See how it works
            </a>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            Free plan · No credit card required · Sign in with GitHub
          </p>
        </Reveal>

        <Reveal className="grid items-center justify-items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <Panel label="Your knowledge today...">
            <ChaosAnimation />
          </Panel>
          <div
            aria-hidden
            className="grid size-14 rotate-90 place-items-center rounded-full bg-linear-135 from-blue-500 to-violet-500 text-white animate-arrow-pulse motion-reduce:animate-none lg:rotate-0"
          >
            <ArrowRight className="size-6.5" strokeWidth={2.5} />
          </div>
          <Panel
            label="...with DevStash"
            className="border-blue-500/30 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8),0_0_60px_-20px_rgb(59_130_246/0.35)]"
          >
            <DashboardPreview />
          </Panel>
        </Reveal>
      </Container>
    </section>
  );
}
