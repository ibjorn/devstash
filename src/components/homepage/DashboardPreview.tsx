import { SYSTEM_TYPES, type SystemTypeName } from "@/lib/system-types";
import { typeColorTint } from "@/lib/type-colors";
import { pluralTypeName } from "@/lib/type-names";

// The app sidebar's type order
const NAV_TYPES: SystemTypeName[] = [
  "Snippet",
  "Prompt",
  "Command",
  "Note",
  "File",
  "Image",
  "Link",
];

const CARDS: { title: string; type: SystemTypeName }[] = [
  { title: "useDebounce", type: "Snippet" },
  { title: "Code review", type: "Prompt" },
  { title: "Docker prune", type: "Command" },
  { title: "Auth notes", type: "Note" },
  { title: "Next.js docs", type: "Link" },
  { title: "Wireframe", type: "Image" },
];

function PreviewCard({ title, type }: (typeof CARDS)[number]) {
  const { color } = SYSTEM_TYPES[type];
  return (
    <span
      className="flex min-w-0 flex-col gap-1.25 rounded-[7px] border border-t-3 bg-[#1f1f1f] px-2.25 pt-2.25 pb-2.5"
      style={{ borderColor: typeColorTint(color, 25), borderTopColor: color }}
    >
      <b className="truncate text-[0.68rem] leading-tight font-semibold">
        {title}
      </b>
      <i className="h-1 rounded-xs bg-white/8" />
      <i className="h-1 w-3/5 rounded-xs bg-white/8" />
    </span>
  );
}

/** The hero's "...with DevStash" miniature of the dashboard. */
export function DashboardPreview() {
  return (
    <div
      role="img"
      aria-label="Simplified DevStash dashboard preview"
      className="grid h-75 grid-cols-[96px_1fr] overflow-hidden rounded-[10px] border bg-[#111] md:grid-cols-[112px_1fr]"
    >
      <div className="flex flex-col gap-1 border-r bg-[#141414] px-2.5 py-3">
        <span className="mb-2.5 h-2.5 w-15 rounded-sm bg-linear-90 from-blue-500 to-violet-500" />
        {NAV_TYPES.map((type, index) => (
          <span
            key={type}
            className={`flex items-center gap-2 rounded-md px-1.5 py-1 text-[0.7rem] ${
              index === 0
                ? "bg-white/5 text-foreground"
                : "text-muted-foreground"
            }`}
          >
            <i
              className="size-1.75 rounded-[2px]"
              style={{ backgroundColor: SYSTEM_TYPES[type].color }}
            />
            {pluralTypeName(type)}
          </span>
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-3 p-3">
        <span className="h-5.5 rounded-md border bg-[#181818]" />
        <div className="grid grid-cols-2 gap-2">
          {CARDS.map((card) => (
            <PreviewCard key={card.title} {...card} />
          ))}
        </div>
      </div>
    </div>
  );
}
