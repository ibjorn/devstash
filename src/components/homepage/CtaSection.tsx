import Link from "next/link";

import { Container } from "./Container";
import { Reveal } from "./Reveal";
import { CTA_LARGE, SECTION_TITLE } from "./shared";

interface CtaSectionProps {
  href: string;
  label: string;
}

export function CtaSection({ href, label }: CtaSectionProps) {
  return (
    <section className="pb-20 md:pb-28">
      <Container>
        <Reveal className="rounded-3xl border bg-card bg-[radial-gradient(500px_220px_at_50%_0%,rgb(59_130_246/0.18),transparent_70%)] px-6 py-18 text-center">
          <h2 className={SECTION_TITLE}>Ready to Organize Your Knowledge?</h2>
          <p className="mx-auto mb-8 max-w-130 text-[1.05rem] text-muted-foreground">
            Bring your snippets, prompts and commands home. It takes less than a
            minute.
          </p>
          <Link href={href} className={CTA_LARGE}>
            {label}
          </Link>
        </Reveal>
      </Container>
    </section>
  );
}
