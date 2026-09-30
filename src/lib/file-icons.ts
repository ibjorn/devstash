import {
  File,
  FileBraces,
  FileCode,
  FileCog,
  FileSpreadsheet,
  FileText,
  type LucideIcon,
} from "lucide-react";

import { fileExtension } from "@/lib/uploads";

// Covers every extension UPLOAD_RULES.file accepts; anything else (including
// a missing name) falls back to the plain File icon.
const FILE_ICONS: Record<string, LucideIcon> = {
  pdf: FileText,
  txt: FileText,
  md: FileText,
  json: FileBraces,
  yaml: FileCode,
  yml: FileCode,
  xml: FileCode,
  csv: FileSpreadsheet,
  toml: FileCog,
  ini: FileCog,
};

export function fileIconFor(fileName: string | null): LucideIcon {
  if (!fileName) return File;
  const ext = fileExtension(fileName);
  // hasOwn so "constructor" and friends can't resolve to prototype members
  return Object.hasOwn(FILE_ICONS, ext) ? FILE_ICONS[ext] : File;
}
