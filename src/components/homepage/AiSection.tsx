import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { Container } from "./Container";
import { Reveal } from "./Reveal";
import { Checklist, SECTION_TITLE } from "./shared";

const AI_FEATURES = [
  "Auto-tag suggestions on every save",
  "One-line AI summaries",
  "“Explain this code” for any snippet",
  "Prompt optimizer for your AI prompts",
];

// Each tag pops in a beat after the last once the editor is revealed. Static
// class strings so Tailwind can see them.
const AI_TAGS = [
  { name: "react", delay: "[animation-delay:500ms]" },
  { name: "hooks", delay: "[animation-delay:750ms]" },
  { name: "debounce", delay: "[animation-delay:1000ms]" },
  { name: "typescript", delay: "[animation-delay:1250ms]" },
];

// VS Code Dark+ token colours
const K = "text-[#c586c0]";
const F = "text-[#dcdcaa]";
const T = "text-[#4ec9b0]";
const N = "text-[#b5cea8]";

function EditorMockup() {
  return (
    <div
      role="img"
      aria-label="Code editor showing AI generated tags"
      className="overflow-hidden rounded-[14px] border bg-card shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)]"
    >
      <div className="flex items-center gap-1.75 border-b bg-white/3 px-3.5 py-2.5">
        <span className="size-2.75 rounded-full bg-[#ff5f57]" />
        <span className="size-2.75 rounded-full bg-[#febc2e]" />
        <span className="size-2.75 rounded-full bg-[#28c840]" />
        <span className="ml-auto font-mono text-xs text-zinc-500">
          typescript
        </span>
      </div>
      <pre className="overflow-x-auto px-5 py-4.5 font-mono text-[0.82rem] leading-[1.7] text-[#d4d4d4]">
        <code>
          <span className={K}>export function</span>{" "}
          <span className={F}>useDebounce</span>&lt;<span className={T}>T</span>
          &gt;(value: <span className={T}>T</span>, delay ={" "}
          <span className={N}>300</span>) {"{"}
          {"\n  "}
          <span className={K}>const</span> [debounced, setDebounced] ={" "}
          <span className={F}>useState</span>(value);
          {"\n\n  "}
          <span className={F}>useEffect</span>(() =&gt; {"{"}
          {"\n    "}
          <span className={K}>const</span> id ={" "}
          <span className={F}>setTimeout</span>(() =&gt;{" "}
          <span className={F}>setDebounced</span>(value), delay);
          {"\n    "}
          <span className={K}>return</span> () =&gt;{" "}
          <span className={F}>clearTimeout</span>(id);
          {"\n  }, [value, delay]);\n\n  "}
          <span className={K}>return</span> debounced;
          {"\n}"}
        </code>
      </pre>
      <div className="flex flex-wrap items-center gap-2 border-t bg-violet-500/5 px-5 py-3.5">
        <span className="mr-1 inline-flex items-center gap-1.5 text-[0.8rem] font-semibold text-violet-300">
          <Sparkles className="size-3.75" />
          AI Generated Tags
        </span>
        {AI_TAGS.map(({ name, delay }) => (
          <span
            key={name}
            className={`rounded-full border border-violet-500/35 bg-violet-500/10 px-2.5 py-0.75 font-mono text-xs text-violet-200 in-data-[reveal=shown]:animate-tag-in motion-reduce:animate-none! ${delay}`}
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AiSection() {
  return (
    <section className="border-y bg-[#0f0f10] py-20 md:py-28">
      <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
        <Reveal>
          <Badge className="h-auto border-violet-500/40 bg-violet-500/12 px-2.5 py-1 text-[0.72rem] font-semibold tracking-[0.06em] text-violet-300 uppercase">
            Pro Feature
          </Badge>
          <h2 className={SECTION_TITLE}>Let AI do the filing</h2>
          <p className="mb-7 text-[1.05rem] text-muted-foreground">
            Save something and DevStash suggests the tags, writes the summary
            and explains the code — so your stash stays organised without the
            busywork.
          </p>
          <Checklist items={AI_FEATURES} />
        </Reveal>
        <Reveal>
          <EditorMockup />
        </Reveal>
      </Container>
    </section>
  );
}
