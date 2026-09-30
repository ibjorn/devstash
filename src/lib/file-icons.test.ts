import {
  File,
  FileBraces,
  FileCode,
  FileCog,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { describe, expect, it } from "vitest";

import { fileIconFor } from "@/lib/file-icons";
import { UPLOAD_RULES } from "@/lib/uploads";

describe("fileIconFor", () => {
  it("maps each extension family to its icon", () => {
    expect(fileIconFor("report.pdf")).toBe(FileText);
    expect(fileIconFor("notes.md")).toBe(FileText);
    expect(fileIconFor("data.json")).toBe(FileBraces);
    expect(fileIconFor("compose.yml")).toBe(FileCode);
    expect(fileIconFor("feed.xml")).toBe(FileCode);
    expect(fileIconFor("export.csv")).toBe(FileSpreadsheet);
    expect(fileIconFor("Cargo.toml")).toBe(FileCog);
  });

  it("ignores extension case", () => {
    expect(fileIconFor("README.MD")).toBe(FileText);
  });

  it("gives every uploadable file extension a specific icon", () => {
    for (const ext of Object.keys(UPLOAD_RULES.file.extensions)) {
      expect(fileIconFor(`x.${ext}`), ext).not.toBe(File);
    }
  });

  it("falls back to File for unknown, missing or prototype extensions", () => {
    expect(fileIconFor("archive.zip")).toBe(File);
    expect(fileIconFor("Makefile")).toBe(File);
    expect(fileIconFor(null)).toBe(File);
    expect(fileIconFor("x.constructor")).toBe(File);
    expect(fileIconFor("x.toString")).toBe(File);
  });
});
