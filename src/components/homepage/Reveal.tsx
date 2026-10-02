"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Fades its content in when scrolled into view. The content renders visible
 * on the server and is only hidden after mount, and only when it starts below
 * the fold, so nothing already on screen blinks and nothing depends on JS.
 * The hidden state is a data attribute set on the DOM node rather than React
 * state, so mounting doesn't trigger a second render. Reduced motion shows
 * everything at once, including when the setting changes while the page is
 * open (the motion-reduce classes override the hidden state).
 */
export function Reveal({ children, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    el.dataset.reveal = "hidden";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = "shown";
        observer.disconnect();
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,translate] duration-700 ease-out data-[reveal=hidden]:translate-y-6 data-[reveal=hidden]:opacity-0 motion-reduce:translate-y-0! motion-reduce:opacity-100! motion-reduce:transition-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
