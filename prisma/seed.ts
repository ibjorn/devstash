import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import type { ItemContentType } from "../src/generated/prisma/client";

const adapter = new PrismaNeon({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const DEMO_EMAIL = "demo@devstash.io";
const DEMO_PASSWORD = "12345678";

const SYSTEM_TYPES = [
  { name: "Snippet", icon: "Code", color: "#3b82f6" },
  { name: "Prompt", icon: "Sparkles", color: "#8b5cf6" },
  { name: "Command", icon: "Terminal", color: "#f97316" },
  { name: "Note", icon: "StickyNote", color: "#fde047" },
  { name: "Link", icon: "Link", color: "#10b981" },
  { name: "File", icon: "File", color: "#6b7280" },
  { name: "Image", icon: "Image", color: "#ec4899" },
];

interface SeedItem {
  title: string;
  description?: string;
  type: string;
  contentType: ItemContentType;
  content?: string;
  url?: string;
  language?: string;
  isFavorite?: boolean;
  isPinned?: boolean;
}

interface SeedCollection {
  name: string;
  description: string;
  isFavorite?: boolean;
  items: SeedItem[];
}

const COLLECTIONS: SeedCollection[] = [
  {
    name: "React Patterns",
    description: "Reusable React patterns and hooks",
    isFavorite: true,
    items: [
      {
        title: "useDebounce hook",
        description: "Debounce a fast-changing value before using it in effects or queries",
        type: "Snippet",
        contentType: "TEXT",
        language: "typescript",
        isPinned: true,
        content: `import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}`,
      },
      {
        title: "Typed context provider pattern",
        description: "Context + hook pair that throws when used outside the provider",
        type: "Snippet",
        contentType: "TEXT",
        language: "typescript",
        content: `import { createContext, useContext, type ReactNode } from "react";

interface ThemeContextValue {
  theme: "dark" | "light";
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  value,
  children,
}: {
  value: ThemeContextValue;
  children: ReactNode;
}) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}`,
      },
      {
        title: "groupBy utility",
        description: "Generic typed groupBy for arrays",
        type: "Snippet",
        contentType: "TEXT",
        language: "typescript",
        content: `export function groupBy<T, K extends string | number>(
  items: T[],
  getKey: (item: T) => K,
): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const key = getKey(item);
      (acc[key] ??= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}`,
      },
    ],
  },
  {
    name: "AI Workflows",
    description: "AI prompts and workflow automations",
    items: [
      {
        title: "Code review prompt",
        description: "Strict reviewer persona for pull request diffs",
        type: "Prompt",
        contentType: "TEXT",
        isFavorite: true,
        content: `You are a senior engineer reviewing a pull request. Review the diff below for:

1. Correctness bugs and unhandled edge cases
2. Security issues (injection, auth checks, leaked secrets)
3. Performance problems (N+1 queries, unnecessary re-renders)
4. Readability and naming

For each finding, give the file/line, severity (blocker/major/minor), and a concrete fix. If the code is fine, say so — do not invent issues.

Diff:
{{DIFF}}`,
      },
      {
        title: "Documentation generator",
        description: "Generate reference docs from source code",
        type: "Prompt",
        contentType: "TEXT",
        content: `Generate developer documentation for the code below. Include:

- A one-paragraph overview of what it does and when to use it
- Parameter and return type tables
- A minimal usage example and one realistic advanced example
- Any gotchas, side effects, or error conditions

Write in Markdown. Be precise — never document behavior the code doesn't have.

Code:
{{CODE}}`,
      },
      {
        title: "Refactoring assistant",
        description: "Propose safe, incremental refactors",
        type: "Prompt",
        contentType: "TEXT",
        content: `Analyze the code below and propose refactorings that improve clarity without changing behavior. Rules:

- Preserve the public API and all observable behavior
- Prefer several small, independently applyable steps over one big rewrite
- For each step: name it, show before/after, and explain the benefit in one sentence
- Flag any step that needs test coverage before it is safe to apply

Code:
{{CODE}}`,
      },
    ],
  },
  {
    name: "DevOps",
    description: "Infrastructure and deployment resources",
    items: [
      {
        title: "Next.js multi-stage Dockerfile",
        description: "Small production image using the standalone output",
        type: "Snippet",
        contentType: "TEXT",
        language: "dockerfile",
        content: `FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]`,
      },
      {
        title: "Zero-downtime deploy",
        description: "Pull, migrate, and restart behind a health check",
        type: "Command",
        contentType: "TEXT",
        language: "bash",
        content: `git pull --ff-only \\
  && npm ci \\
  && npx prisma migrate deploy \\
  && npm run build \\
  && pm2 reload devstash --update-env`,
      },
      {
        title: "Docker documentation",
        description: "Official Docker docs",
        type: "Link",
        contentType: "URL",
        url: "https://docs.docker.com/",
      },
      {
        title: "GitHub Actions documentation",
        description: "Workflows, runners, and CI/CD reference",
        type: "Link",
        contentType: "URL",
        url: "https://docs.github.com/en/actions",
      },
    ],
  },
  {
    name: "Terminal Commands",
    description: "Useful shell commands for everyday development",
    items: [
      {
        title: "Undo last commit (keep changes)",
        description: "Move HEAD back one commit but leave the work tree untouched",
        type: "Command",
        contentType: "TEXT",
        language: "bash",
        isPinned: true,
        content: "git reset --soft HEAD~1",
      },
      {
        title: "Docker cleanup",
        description: "Remove stopped containers, unused images, networks, and build cache",
        type: "Command",
        contentType: "TEXT",
        language: "bash",
        content: "docker system prune -af --volumes",
      },
      {
        title: "Kill process on port 3000",
        description: "Find and kill whatever is holding a port",
        type: "Command",
        contentType: "TEXT",
        language: "bash",
        content: "lsof -ti :3000 | xargs -r kill -9",
      },
      {
        title: "List outdated npm packages",
        description: "Show direct dependencies with newer versions available",
        type: "Command",
        contentType: "TEXT",
        language: "bash",
        content: "npm outdated --long",
      },
    ],
  },
  {
    name: "Design Resources",
    description: "UI/UX resources and references",
    isFavorite: true,
    items: [
      {
        title: "Tailwind CSS docs",
        description: "Utility-first CSS framework reference",
        type: "Link",
        contentType: "URL",
        url: "https://tailwindcss.com/docs",
        isFavorite: true,
      },
      {
        title: "shadcn/ui",
        description: "Copy-paste component library built on Radix",
        type: "Link",
        contentType: "URL",
        url: "https://ui.shadcn.com/",
      },
      {
        title: "Radix Primitives",
        description: "Unstyled, accessible component primitives",
        type: "Link",
        contentType: "URL",
        url: "https://www.radix-ui.com/primitives",
      },
      {
        title: "Lucide icons",
        description: "Open-source icon library used across DevStash",
        type: "Link",
        contentType: "URL",
        url: "https://lucide.dev/",
      },
    ],
  },
];

async function seedSystemTypes(): Promise<Map<string, string>> {
  const typeIds = new Map<string, string>();

  for (const type of SYSTEM_TYPES) {
    // Can't upsert: system types have userId = null, and Postgres treats
    // NULLs as distinct in the [userId, name] unique constraint
    const existing = await prisma.itemType.findFirst({
      where: { name: type.name, userId: null, isSystem: true },
    });

    if (existing) {
      const updated = await prisma.itemType.update({
        where: { id: existing.id },
        data: { icon: type.icon, color: type.color },
      });
      typeIds.set(type.name, updated.id);
      console.log(`Updated system type: ${type.name}`);
    } else {
      const created = await prisma.itemType.create({
        data: { ...type, isSystem: true },
      });
      typeIds.set(type.name, created.id);
      console.log(`Created system type: ${type.name}`);
    }
  }

  return typeIds;
}

async function seedDemoUser(): Promise<string> {
  const password = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { name: "Demo User", password, emailVerified: new Date() },
    create: {
      email: DEMO_EMAIL,
      name: "Demo User",
      password,
      isPro: false,
      emailVerified: new Date(),
    },
  });

  // Wipe the demo user's existing data so reseeding starts clean
  await prisma.item.deleteMany({ where: { userId: user.id } });
  await prisma.collection.deleteMany({ where: { userId: user.id } });

  console.log(`Upserted demo user: ${DEMO_EMAIL}`);
  return user.id;
}

async function seedCollections(userId: string, typeIds: Map<string, string>) {
  for (const col of COLLECTIONS) {
    const collection = await prisma.collection.create({
      data: {
        name: col.name,
        description: col.description,
        isFavorite: col.isFavorite ?? false,
        userId,
      },
    });

    for (const item of col.items) {
      const itemTypeId = typeIds.get(item.type);
      if (!itemTypeId) throw new Error(`Unknown item type: ${item.type}`);

      await prisma.item.create({
        data: {
          title: item.title,
          description: item.description,
          contentType: item.contentType,
          content: item.content,
          url: item.url,
          language: item.language,
          isFavorite: item.isFavorite ?? false,
          isPinned: item.isPinned ?? false,
          userId,
          itemTypeId,
          collections: {
            create: [{ collectionId: collection.id }],
          },
        },
      });
    }

    console.log(`Created collection: ${col.name} (${col.items.length} items)`);
  }
}

async function main() {
  const typeIds = await seedSystemTypes();
  const userId = await seedDemoUser();
  await seedCollections(userId, typeIds);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
