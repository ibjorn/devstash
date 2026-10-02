import Link from "next/link";

import { Container } from "./Container";
import { Logo } from "./Logo";

interface FooterLink {
  label: string;
  href: string;
}

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Get started", href: "/register" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/sign-in" },
      { label: "Register", href: "/register" },
      { label: "Reset password", href: "/forgot-password" },
    ],
  },
];

// py-1 gives the footer links a 28px tap target; self-start keeps the hit
// area to the text rather than the whole column
const LINK_CLASS =
  "self-start py-1 text-muted-foreground transition-colors hover:text-foreground";

// In-page anchors stay plain <a>; routes go through next/link
function FooterLinkItem({ label, href }: FooterLink) {
  return href.startsWith("#") ? (
    <a href={href} className={LINK_CLASS}>
      {label}
    </a>
  ) : (
    <Link href={href} className={LINK_CLASS}>
      {label}
    </Link>
  );
}

export function HomeFooter() {
  return (
    <footer className="border-t pt-16 pb-8">
      <Container className="grid grid-cols-2 gap-10 md:grid-cols-[2fr_1fr_1fr]">
        <div className="col-span-full md:col-span-1">
          <Logo />
          <p className="mt-3.5 max-w-75 text-[0.92rem] text-muted-foreground">
            One fast, searchable hub for everything a developer wants to keep
            close.
          </p>
        </div>
        {COLUMNS.map(({ title, links }) => (
          <nav
            key={title}
            aria-label={title}
            className="flex flex-col gap-1 text-[0.92rem]"
          >
            <h4 className="mb-2 text-sm font-bold">{title}</h4>
            {links.map((link) => (
              <FooterLinkItem key={link.label} {...link} />
            ))}
          </nav>
        ))}
      </Container>
      <Container className="mt-12">
        <p className="border-t pt-6 text-sm text-zinc-500">
          &copy; {new Date().getFullYear()} DevStash. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
