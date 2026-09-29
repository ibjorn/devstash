/**
 * Upload rules for File and Image items. Pure — no SDK, no Node APIs — so the
 * New Item dialog can check a file before uploading it with exactly the table
 * the server enforces afterwards.
 */

export type UploadKind = "image" | "file";

const MB = 1024 * 1024;

interface UploadRule {
  maxBytes: number;
  // Extension -> the MIME types a browser may report for it. The extension is
  // what's enforced; the MIME list only catches a browser reporting something
  // that plainly isn't the claimed format.
  extensions: Record<string, readonly string[]>;
}

export const UPLOAD_RULES: Record<UploadKind, UploadRule> = {
  image: {
    maxBytes: 5 * MB,
    extensions: {
      png: ["image/png"],
      jpg: ["image/jpeg"],
      jpeg: ["image/jpeg"],
      gif: ["image/gif"],
      webp: ["image/webp"],
      svg: ["image/svg+xml"],
    },
  },
  file: {
    maxBytes: 10 * MB,
    extensions: {
      pdf: ["application/pdf"],
      txt: ["text/plain"],
      md: ["text/markdown", "text/plain"],
      json: ["application/json"],
      yaml: ["application/x-yaml", "text/yaml", "text/plain"],
      yml: ["application/x-yaml", "text/yaml", "text/plain"],
      xml: ["application/xml", "text/xml"],
      csv: ["text/csv"],
      toml: ["application/toml", "text/plain"],
      ini: ["text/plain"],
    },
  },
};

// What the download proxy serves each extension as. Chosen here rather than
// read back from R2: the presigned PUT doesn't sign Content-Type, so whatever
// the object was stored with is caller-controlled.
const SERVE_AS: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  json: "application/json",
  xml: "application/xml",
  csv: "text/csv",
};

// Raster formats a browser renders without running anything. SVG is left out
// on purpose: it can carry script, so the proxy never serves it inline.
const INLINE_SAFE = new Set(["png", "jpg", "jpeg", "gif", "webp"]);

// Name-based on purpose: a type's name is fixed for system types, and File and
// Image are the only two that hold uploads
export function uploadKindFor(typeName: string): UploadKind | null {
  if (typeName === "Image") return "image";
  if (typeName === "File") return "file";
  return null;
}

export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

export function acceptAttribute(kind: UploadKind): string {
  return Object.keys(UPLOAD_RULES[kind].extensions)
    .map((ext) => `.${ext}`)
    .join(",");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

export interface UploadCandidate {
  fileName: string;
  fileSize: number;
  // What the browser reported; empty when it didn't know
  mimeType?: string;
}

/** Null when the file is acceptable, otherwise a message fit for the user. */
export function validateUpload(
  kind: UploadKind,
  { fileName, fileSize, mimeType }: UploadCandidate,
): string | null {
  const rule = UPLOAD_RULES[kind];
  const ext = fileExtension(fileName);

  // hasOwn, not a plain lookup: ".constructor" must not resolve to a prototype
  // member and pass as an allowed extension
  if (!Object.hasOwn(rule.extensions, ext)) {
    const list = Object.keys(rule.extensions).join(", ");
    return `That file type isn't supported. Allowed: ${list}.`;
  }
  if (!Number.isInteger(fileSize) || fileSize <= 0) {
    return "That file is empty.";
  }
  if (fileSize > rule.maxBytes) {
    return `That file is too large — the limit is ${formatBytes(rule.maxBytes)}.`;
  }
  // Browsers leave the type empty for extensions they don't recognise (.toml,
  // .ini, often .md), so only a type that is present *and* wrong is refused
  if (mimeType && !rule.extensions[ext].includes(mimeType)) {
    return "That file's contents don't match its extension.";
  }
  return null;
}

/**
 * Reduce a user-supplied name to something safe inside an object key and a
 * Content-Disposition header: no path separators, no control characters, no
 * quotes, bounded length, extension kept.
 */
export function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._ -]+/gu, "_")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+/, "")
    .trim();

  const ext = fileExtension(cleaned);
  const stem = ext ? cleaned.slice(0, -(ext.length + 1)) : cleaned;
  // By code point, not UTF-16 unit: slicing through a surrogate pair would
  // leave a lone half that a second pass rewrites, and fileNameFromKey relies
  // on this being idempotent
  const shortStem = Array.from(stem).slice(0, 100).join("") || "file";
  return ext ? `${shortStem}.${ext}` : shortStem;
}

/**
 * Every object lives under its owner's id, so ownership can be checked from
 * the key alone and account deletion can sweep a single prefix. The random
 * segment keeps two uploads of the same name apart.
 */
export function buildObjectKey(
  userId: string,
  fileName: string,
  id: string = crypto.randomUUID(),
): string {
  return `${userId}/${id}/${sanitizeFileName(fileName)}`;
}

export function userKeyPrefix(userId: string): string {
  return `${userId}/`;
}

/**
 * The file name a key was built with, but only if the key has exactly the
 * shape `buildObjectKey` produces for this user. Anything else — another
 * user's prefix, extra segments, `..` — is null.
 */
export function fileNameFromKey(userId: string, key: string): string | null {
  const parts = key.split("/");
  if (parts.length !== 3) return null;

  const [owner, id, name] = parts;
  if (owner !== userId || !/^[0-9a-f-]{36}$/.test(id)) return null;
  if (!name || name !== sanitizeFileName(name)) return null;
  return name;
}

export interface ServingHeaders {
  contentType: string;
  inline: boolean;
}

/** How the proxy should serve a stored file, decided from its name alone. */
export function servingHeadersFor(
  fileName: string,
  wantsDownload: boolean,
): ServingHeaders {
  const ext = fileExtension(fileName);
  return {
    // Text formats go out as text/plain so a browser shows them rather than
    // guessing; anything unlisted is opaque bytes
    contentType: Object.hasOwn(SERVE_AS, ext)
      ? SERVE_AS[ext]
      : Object.hasOwn(UPLOAD_RULES.file.extensions, ext)
        ? "text/plain; charset=utf-8"
        : "application/octet-stream",
    inline: !wantsDownload && INLINE_SAFE.has(ext),
  };
}

/** RFC 6266 disposition with an ASCII fallback and the UTF-8 name. */
export function contentDisposition(fileName: string, inline: boolean): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(fileName);
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
