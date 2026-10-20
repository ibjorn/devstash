"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { isActivePath, NAV_ACTIVE_CLASS } from "@/lib/nav";

interface NavLinkItemProps {
  href: string;
  /** The link text, and its tooltip in the collapsed icon rail. */
  label: string;
  icon: React.ReactNode;
  /** Right-aligned count or marker, outside the link. */
  badge?: React.ReactNode;
  /** Only light up on `href` itself, not on the pages beneath it. */
  exact?: boolean;
  linkClassName?: string;
  /** Extra content inside the link, after the label. */
  children?: React.ReactNode;
}

/** One sidebar link, lit with the left-bar active state on its own pages. */
export function NavLinkItem({
  href,
  label,
  icon,
  badge,
  exact = false,
  linkClassName,
  children,
}: NavLinkItemProps) {
  const pathname = usePathname();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActivePath(pathname, href, { exact })}
        tooltip={label}
        className={NAV_ACTIVE_CLASS}
      >
        <Link href={href} className={linkClassName}>
          {icon}
          <span>{label}</span>
          {children}
        </Link>
      </SidebarMenuButton>
      {badge !== undefined && <SidebarMenuBadge>{badge}</SidebarMenuBadge>}
    </SidebarMenuItem>
  );
}
