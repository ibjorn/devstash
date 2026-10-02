import type { SVGProps } from "react";

// lucide v1 has no brand icons, so the chaos box's marks are simplified inline
// SVGs (not the official logos). GitHub reuses src/components/auth/GitHubIcon.

export function NotionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3" fill="#fff" />
      <path
        d="M8 7.5v9M8 7.5l8 9M16 7.5v9"
        stroke="#111"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SlackIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <rect x="9.5" y="2" width="4" height="9" rx="2" fill="#36c5f0" />
      <rect x="13" y="9.5" width="9" height="4" rx="2" fill="#2eb67d" />
      <rect x="10.5" y="13" width="4" height="9" rx="2" fill="#ecb22e" />
      <rect x="2" y="10.5" width="9" height="4" rx="2" fill="#e01e5a" />
    </svg>
  );
}

export function VsCodeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <path
        fill="#22a6f2"
        d="M17.5 2 21 3.7v16.6L17.5 22 8 13.3l-4.2 3.2L2 15.6V8.4l1.8-.9L8 10.7 17.5 2Zm0 5.2L12 12l5.5 4.8V7.2ZM4 9.9v4.2L6.2 12 4 9.9Z"
      />
    </svg>
  );
}
