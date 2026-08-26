import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit tests cover server actions and utilities only — no components, so
    // there's no jsdom and no Testing Library. See context/ai-interaction.md.
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Explicit imports from "vitest" rather than injected globals, so a test
    // file reads like the rest of the codebase and needs no extra tsconfig types.
    globals: false,
    server: {
      deps: {
        // next-auth ships ESM that imports "next/server" as a bare specifier,
        // which Node can't resolve when the package is left external. Letting
        // Vite transform it uses Vite's resolver instead.
        inline: ["next-auth", "@auth/core"],
      },
    },
  },
  resolve: {
    // Mirrors the "@/*" path in tsconfig.json. Set by hand rather than via
    // vite-tsconfig-paths — it's one alias, and one fewer dependency.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
