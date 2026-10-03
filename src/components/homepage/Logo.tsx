import Link from "next/link";
import { Package } from "lucide-react";

interface LogoProps {
  href?: string;
}

const LOGO_CLASS = "inline-flex items-center gap-2.5 text-[1.05rem] font-bold";

/** Gradient logo mark + wordmark, shared by the homepage nav and footer. */
export function Logo({ href = "#top" }: LogoProps) {
  const content = (
    <>
      <span
        className="grid size-7.5 place-items-center rounded-lg bg-linear-135 from-blue-500 to-violet-500 text-white"
        aria-hidden
      >
        <Package className="size-4.25" />
      </span>
      DevStash
    </>
  );

  // Same-page anchors stay native: next/link updates the hash without
  // scrolling back to #top, while a plain <a> scrolls (smoothly, via the
  // homepage's scroll-behavior rule in globals.css).
  if (href.startsWith("#")) {
    return (
      <a href={href} className={LOGO_CLASS} aria-label="DevStash home">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={LOGO_CLASS} aria-label="DevStash home">
      {content}
    </Link>
  );
}
