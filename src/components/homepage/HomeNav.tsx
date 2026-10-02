"use client";

import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const SCROLL_THRESHOLD = 16;

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

const isScrolled = () => window.scrollY > SCROLL_THRESHOLD;

interface HomeNavProps {
  children: React.ReactNode;
}

/**
 * Fixed homepage nav. The scroll-driven opacity is its only client logic, so
 * the logo, links and buttons arrive as server-rendered children.
 */
export function HomeNav({ children }: HomeNavProps) {
  const scrolled = useSyncExternalStore(subscribe, isScrolled, () => false);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md transition-colors duration-300",
        scrolled
          ? "border-border bg-background/90"
          : "border-transparent bg-background/35",
      )}
    >
      {children}
    </header>
  );
}
