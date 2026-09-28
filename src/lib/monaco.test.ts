import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { MONACO_CDN_PATH, MONACO_VERSION } from "./monaco";

function readJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8"));
}

describe("MONACO_VERSION", () => {
  it("matches the exact monaco-editor version pinned in package.json", () => {
    const pkg = readJson("package.json");
    expect(pkg.devDependencies["monaco-editor"]).toBe(MONACO_VERSION);
  });

  it("matches the monaco-editor actually installed", () => {
    const installed = readJson("node_modules/monaco-editor/package.json");
    expect(installed.version).toBe(MONACO_VERSION);
  });

  it("is the version the CDN path loads", () => {
    expect(MONACO_CDN_PATH).toContain(`monaco-editor@${MONACO_VERSION}/`);
  });
});
