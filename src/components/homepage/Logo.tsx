import { Package } from "lucide-react";

interface LogoProps {
  href?: string;
}

/** Gradient logo mark + wordmark, shared by the homepage nav and footer. */
export function Logo({ href = "#top" }: LogoProps) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2.5 text-[1.05rem] font-bold"
      aria-label="DevStash home"
    >
      <span
        className="grid size-7.5 place-items-center rounded-lg bg-linear-135 from-blue-500 to-violet-500 text-white"
        aria-hidden
      >
        <Package className="size-4.25" />
      </span>
      DevStash
    </a>
  );
}
