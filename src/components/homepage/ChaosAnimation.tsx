"use client";

import { AppWindow, Bookmark, FileText, Terminal } from "lucide-react";
import { useEffect, useRef } from "react";

import { GitHubIcon } from "@/components/auth/GitHubIcon";
import { SYSTEM_TYPES } from "@/lib/system-types";

import { NotionIcon, SlackIcon, VsCodeIcon } from "./brand-icons";

interface ChaosIcon {
  label: string;
  color: string;
  icon: React.ReactNode;
  // Where the icon sits before the animation takes over (and when motion is
  // reduced), so the field reads as a loose scatter rather than a pile
  scatter: string;
}

const ICONS: ChaosIcon[] = [
  {
    label: "Notion",
    color: "#e5e5e5",
    icon: <NotionIcon className="size-6.5" />,
    scatter: "top-[8%] left-[6%]",
  },
  {
    label: "GitHub",
    color: "#e5e5e5",
    icon: <GitHubIcon className="size-6.5 text-neutral-100" />,
    scatter: "top-[14%] left-[44%]",
  },
  {
    label: "Slack",
    color: "#e01e5a",
    icon: <SlackIcon className="size-6.5" />,
    scatter: "top-[6%] left-[76%]",
  },
  {
    label: "VS Code",
    color: "#22a6f2",
    icon: <VsCodeIcon className="size-6.5" />,
    scatter: "top-[42%] left-[22%]",
  },
  {
    label: "Browser tabs",
    color: "#a78bfa",
    icon: <AppWindow className="size-6.5" />,
    scatter: "top-[46%] left-[62%]",
  },
  {
    label: "Terminal",
    color: SYSTEM_TYPES.Command.color,
    icon: <Terminal className="size-6.5" />,
    scatter: "top-[74%] left-[8%]",
  },
  {
    label: "Text file",
    color: SYSTEM_TYPES.Note.color,
    icon: <FileText className="size-6.5" />,
    scatter: "top-[72%] left-[42%]",
  },
  {
    label: "Bookmark",
    color: SYSTEM_TYPES.Link.color,
    icon: <Bookmark className="size-6.5" />,
    scatter: "top-[70%] left-[78%]",
  },
];

const MAX_SPEED = 1.6;
const REPEL_RADIUS = 110;
const REPEL_FORCE = 0.9;
const FRICTION = 0.985;
const MIN_SPEED = 0.35;

interface Particle {
  el: HTMLElement;
  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  phase: number;
}

interface Point {
  x: number;
  y: number;
}

interface Bounds {
  width: number;
  height: number;
}

const random = (min: number, max: number) => min + Math.random() * (max - min);

// Starts each particle from its CSS scatter position so the switch to JS
// positioning doesn't jump
function createParticles(icons: HTMLElement[], bounds: Bounds): Particle[] {
  return icons.map((el) => {
    const size = el.offsetWidth;
    const angle = random(0, Math.PI * 2);
    const speed = random(0.5, 1.1);
    return {
      el,
      size,
      x: Math.min(el.offsetLeft, bounds.width - size),
      y: Math.min(el.offsetTop, bounds.height - size),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: random(-12, 12),
      spin: random(-0.25, 0.25),
      phase: random(0, Math.PI * 2),
    };
  });
}

function repel(p: Particle, pointer: Point) {
  const dx = p.x + p.size / 2 - pointer.x;
  const dy = p.y + p.size / 2 - pointer.y;
  const dist = Math.hypot(dx, dy) || 1;
  if (dist >= REPEL_RADIUS) return;
  const push = ((REPEL_RADIUS - dist) / REPEL_RADIUS) * REPEL_FORCE;
  p.vx += (dx / dist) * push;
  p.vy += (dy / dist) * push;
}

// Bleeds off the burst from a repel, but never lets an icon stall completely
function settleSpeed(p: Particle) {
  const speed = Math.hypot(p.vx, p.vy);
  if (speed > MAX_SPEED * 3) {
    p.vx *= (MAX_SPEED * 3) / speed;
    p.vy *= (MAX_SPEED * 3) / speed;
  } else if (speed > MAX_SPEED) {
    p.vx *= FRICTION;
    p.vy *= FRICTION;
  } else if (speed < MIN_SPEED) {
    p.vx *= 1.02;
    p.vy *= 1.02;
  }
}

function moveAndBounce(p: Particle, bounds: Bounds) {
  p.x += p.vx;
  p.y += p.vy;
  const maxX = bounds.width - p.size;
  const maxY = bounds.height - p.size;
  if (p.x <= 0 || p.x >= maxX) {
    p.x = Math.max(0, Math.min(p.x, maxX));
    p.vx *= -1;
    p.spin *= -1;
  }
  if (p.y <= 0 || p.y >= maxY) {
    p.y = Math.max(0, Math.min(p.y, maxY));
    p.vy *= -1;
  }
}

function stepParticle(
  p: Particle,
  bounds: Bounds,
  pointer: Point | null,
  time: number,
) {
  if (pointer) repel(p, pointer);
  settleSpeed(p);
  moveAndBounce(p, bounds);
  p.rotation += p.spin;
  const scale = 1 + Math.sin(time / 900 + p.phase) * 0.06;
  p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rotation}deg) scale(${scale})`;
}

/**
 * Animates the scattered icons with a requestAnimationFrame loop. Everything
 * runs on refs and direct DOM writes, so a frame never re-renders React.
 * Pauses off-screen or in a hidden tab, freezes back into the CSS scatter
 * under reduced motion (live), and cleans up on unmount.
 */
function useChaos(fieldRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const icons = Array.from(
      field.querySelectorAll<HTMLElement>("[data-icon]"),
    );
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let bounds: Bounds = { width: 0, height: 0 };
    let pointer: Point | null = null;
    let particles: Particle[] = [];
    let frame = 0;
    let fieldVisible = true;

    const measure = () => {
      bounds = { width: field.clientWidth, height: field.clientHeight };
    };
    const tick = (time: number) => {
      for (const p of particles) stepParticle(p, bounds, pointer, time);
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (frame || reducedMotion.matches) return;
      if (!particles.length) {
        measure();
        particles = createParticles(icons, bounds);
        field.dataset.animated = "";
      }
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const freeze = () => {
      stop();
      particles = [];
      delete field.dataset.animated;
      icons.forEach((el) => el.style.removeProperty("transform"));
    };
    const resume = () => {
      if (fieldVisible && !document.hidden) start();
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = field.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const onPointerLeave = () => {
      pointer = null;
    };
    const onResize = () => {
      measure();
      for (const p of particles) {
        p.x = Math.min(p.x, Math.max(0, bounds.width - p.size));
        p.y = Math.min(p.y, Math.max(0, bounds.height - p.size));
      }
    };
    const onVisibility = () => (document.hidden ? stop() : resume());
    const onMotionChange = () => (reducedMotion.matches ? freeze() : resume());

    const observer = new IntersectionObserver(([entry]) => {
      fieldVisible = entry.isIntersecting;
      if (fieldVisible) resume();
      else stop();
    });
    observer.observe(field);

    field.addEventListener("pointermove", onPointerMove);
    field.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    reducedMotion.addEventListener("change", onMotionChange);
    resume();

    return () => {
      stop();
      observer.disconnect();
      field.removeEventListener("pointermove", onPointerMove);
      field.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotion.removeEventListener("change", onMotionChange);
    };
  }, [fieldRef]);
}

/** The hero's "Your knowledge today..." field of drifting tool icons. */
export function ChaosAnimation() {
  const fieldRef = useRef<HTMLDivElement>(null);
  useChaos(fieldRef);

  return (
    <div
      ref={fieldRef}
      role="img"
      aria-label="Developer tools scattered everywhere: Notion, GitHub, Slack, VS Code, browser tabs, a terminal, text files and bookmarks"
      className="group/chaos relative h-75 overflow-hidden rounded-[10px] bg-[#111] bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.06)_1px,transparent_0)] bg-size-[18px_18px]"
    >
      {ICONS.map(({ label, color, icon, scatter }) => (
        <div
          key={label}
          data-icon
          title={label}
          className={`absolute grid size-13 place-items-center rounded-xl border shadow-[0_8px_20px_-8px_rgb(0_0_0/0.8)] will-change-transform group-data-animated/chaos:top-0 group-data-animated/chaos:left-0 ${scatter}`}
          style={{
            color,
            borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
            backgroundColor: `color-mix(in srgb, ${color} 10%, #1a1a1a)`,
          }}
        >
          {icon}
        </div>
      ))}
    </div>
  );
}
