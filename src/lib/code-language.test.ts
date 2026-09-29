import { describe, expect, it } from "vitest";

import { isCodeType, isMarkdownType, toMonacoLanguage } from "./code-language";

describe("isCodeType", () => {
  it("is true for the code-carrying system types", () => {
    expect(isCodeType("Snippet")).toBe(true);
    expect(isCodeType("Command")).toBe(true);
  });

  it("is false for prose and non-text types", () => {
    for (const name of ["Note", "Prompt", "Link", "File", "Image"]) {
      expect(isCodeType(name)).toBe(false);
    }
  });
});

describe("isMarkdownType", () => {
  it("is true for the prose system types", () => {
    expect(isMarkdownType("Note")).toBe(true);
    expect(isMarkdownType("Prompt")).toBe(true);
  });

  it("is false for code and non-text types", () => {
    for (const name of ["Snippet", "Command", "Link", "File", "Image"]) {
      expect(isMarkdownType(name)).toBe(false);
    }
  });
});

describe("toMonacoLanguage", () => {
  it("passes a Monaco id through unchanged", () => {
    expect(toMonacoLanguage("typescript")).toBe("typescript");
    expect(toMonacoLanguage("dockerfile")).toBe("dockerfile");
  });

  it("maps bash to shell, which is what every seeded command uses", () => {
    expect(toMonacoLanguage("bash")).toBe("shell");
    expect(toMonacoLanguage("zsh")).toBe("shell");
  });

  it("maps common short names", () => {
    expect(toMonacoLanguage("ts")).toBe("typescript");
    expect(toMonacoLanguage("js")).toBe("javascript");
    expect(toMonacoLanguage("py")).toBe("python");
    expect(toMonacoLanguage("yml")).toBe("yaml");
    expect(toMonacoLanguage("c#")).toBe("csharp");
  });

  it("ignores case and surrounding whitespace", () => {
    expect(toMonacoLanguage("  TypeScript ")).toBe("typescript");
    expect(toMonacoLanguage("BASH")).toBe("shell");
  });

  it("falls back to plaintext for empty or unknown values", () => {
    expect(toMonacoLanguage(null)).toBe("plaintext");
    expect(toMonacoLanguage(undefined)).toBe("plaintext");
    expect(toMonacoLanguage("   ")).toBe("plaintext");
    expect(toMonacoLanguage("brainfuck")).toBe("plaintext");
  });

  it("does not resolve inherited object keys as aliases", () => {
    expect(toMonacoLanguage("constructor")).toBe("plaintext");
    expect(toMonacoLanguage("toString")).toBe("plaintext");
  });
});
