/**
 * `npm run ui:add -- <component...>` — `shadcn add`, then undo the one thing
 * the registry now does that this project doesn't want.
 *
 * Since September 2026 every shadcn registry item imports its class helper as
 * `import { cn } from "cn"` and lists shadcn's new `cn` npm package as a
 * dependency. This project keeps `cn` in src/lib/utils.ts (clsx +
 * tailwind-merge), so the CLI's output is rewritten back onto that and the
 * package it installed is removed.
 *
 * Prompts from the CLI (e.g. "overwrite button.tsx?") are passed through to the
 * terminal. Answer no unless you mean it — ours may have local changes.
 *
 * If the project ever adopts the `cn` package instead, delete this script.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
// Separate regexes: `.test()` on a /g regex carries lastIndex between calls
// and would silently skip files
const HAS_BAD_IMPORT = /from\s+["']cn["']/;
const BAD_IMPORT = /from\s+["']cn["']/g;
const GOOD_IMPORT = 'from "@/lib/utils"';

function run(command: string, args: string[]): number {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: "inherit" });
  return result.status ?? 1;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      // Prisma's generated client is large and never touched by shadcn
      return name === "generated" ? [] : sourceFiles(path);
    }
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

function rewriteImports(): string[] {
  const rewritten: string[] = [];
  for (const file of sourceFiles(join(ROOT, "src"))) {
    const source = readFileSync(file, "utf8");
    if (!HAS_BAD_IMPORT.test(source)) continue;
    writeFileSync(file, source.replace(BAD_IMPORT, GOOD_IMPORT));
    rewritten.push(file.slice(ROOT.length + 1));
  }
  return rewritten;
}

function cnIsInstalled(): boolean {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  return Boolean(pkg.dependencies?.cn ?? pkg.devDependencies?.cn);
}

const components = process.argv.slice(2);
if (components.length === 0) {
  console.error("Usage: npm run ui:add -- <component...>");
  process.exit(1);
}

const status = run("npx", ["shadcn@latest", "add", ...components]);

// Clean up even after a failed or partial add, so nothing half-applied lingers
for (const file of rewriteImports()) {
  console.log(`ui:add: rewrote cn import in ${file}`);
}
if (cnIsInstalled()) {
  console.log("ui:add: removing the `cn` package the registry installed");
  run("npm", ["uninstall", "cn"]);
}

process.exit(status);
