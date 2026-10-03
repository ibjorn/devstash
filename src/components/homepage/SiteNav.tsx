import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Container } from "./Container";
import { HomeNav } from "./HomeNav";
import { Logo } from "./Logo";
import { NavActionLink } from "./NavActionLink";

const NAV_LINKS = [
  { label: "Features", hash: "#features" },
  { label: "Pricing", hash: "#pricing" },
];

const NAV_BUTTON = "h-9.5 rounded-[10px] px-3 font-semibold sm:px-4";

function NavActions({ signedIn }: { signedIn: boolean }) {
  if (signedIn) {
    return (
      <NavActionLink
        href="/dashboard"
        className={cn(buttonVariants(), NAV_BUTTON)}
      >
        Dashboard
      </NavActionLink>
    );
  }
  return (
    <>
      <NavActionLink
        href="/sign-in"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          NAV_BUTTON,
          "text-muted-foreground",
        )}
      >
        Sign In
      </NavActionLink>
      <NavActionLink
        href="/register"
        className={cn(buttonVariants(), NAV_BUTTON)}
      >
        Get Started
      </NavActionLink>
    </>
  );
}

interface SiteNavProps {
  signedIn: boolean;
  /** True on the homepage, where the logo and section links scroll in place. */
  onHomepage?: boolean;
}

/** The marketing nav, shared by the homepage and the auth pages. */
export function SiteNav({ signedIn, onHomepage = false }: SiteNavProps) {
  const linkBase = onHomepage ? "" : "/";

  return (
    <HomeNav>
      <Container className="flex h-16 items-center gap-8">
        <Logo href={onHomepage ? "#top" : "/"} />
        <nav
          aria-label="Primary"
          className="hidden gap-6 text-sm text-muted-foreground md:flex"
        >
          {NAV_LINKS.map(({ label, hash }) => (
            <a
              key={hash}
              href={`${linkBase}${hash}`}
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
  );
}
