import { Code, File, Folder, Search, Sparkles, Terminal } from "lucide-react";

import { SYSTEM_TYPES } from "@/lib/system-types";

import { Container } from "./Container";
import { type Feature, FeatureCard } from "./FeatureCard";
import { Reveal } from "./Reveal";
import { SectionHeader } from "./shared";

// Collections and Search aren't item types, so they borrow the Image and Link
// colours, as the mockup does
const FEATURES: Feature[] = [
  {
    title: "Code Snippets",
    description:
      "Save reusable code with syntax highlighting in a real editor, tagged by language.",
    icon: Code,
    color: SYSTEM_TYPES.Snippet.color,
  },
  {
    title: "AI Prompts",
    description:
      "Keep the prompts, system messages and context files that actually work — in Markdown.",
    icon: Sparkles,
    color: SYSTEM_TYPES.Prompt.color,
  },
  {
    title: "Instant Search",
    description: (
      <>
        Hit{" "}
        <kbd className="rounded-md border border-white/14 bg-[#1f1f1f] px-1.5 py-px font-mono text-[0.8em]">
          ⌘K
        </kbd>{" "}
        and search titles, content, tags and types from anywhere.
      </>
    ),
    icon: Search,
    color: SYSTEM_TYPES.Link.color,
  },
  {
    title: "Commands",
    description:
      "Stop digging through bash history. One click copies the exact command you need.",
    icon: Terminal,
    color: SYSTEM_TYPES.Command.color,
  },
  {
    title: "Files & Docs",
    description:
      "Upload context files, configs and images, previewed and downloadable in one place.",
    icon: File,
    color: SYSTEM_TYPES.File.color,
  },
  {
    title: "Collections",
    description:
      "Group anything into collections. One item can live in “React Patterns” and “Interview Prep”.",
    icon: Folder,
    color: SYSTEM_TYPES.Image.color,
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-20 py-20 md:py-28">
      <Container>
        <Reveal>
          <SectionHeader
            eyebrow="Features"
            title="Everything a developer keeps close at hand"
            description="Every resource gets a type, a colour and a home. Find any of it in seconds."
          />
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Reveal key={feature.title}>
              <FeatureCard {...feature} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
