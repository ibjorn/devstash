"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavActionLinkProps {
  href: string;
  className: string;
  children: React.ReactNode;
}

/**
 * A nav button link that marks itself as the current page, so "Sign In" on
 * /sign-in is announced as the page you're on rather than a way to reach it.
 */
export function NavActionLink({
  href,
  className,
  children,
}: NavActionLinkProps) {
  const pathname = usePathname();

  return (
    <Link
      href={href}
      className={className}
      aria-current={pathname === href ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
