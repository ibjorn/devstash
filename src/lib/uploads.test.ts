import { describe, expect, it } from "vitest";

import {
  acceptAttribute,
  buildObjectKey,
  contentDisposition,
  fileNameFromKey,
  sanitizeFileName,
  servingHeadersFor,
  uploadKindFor,
  validateUpload,
} from "@/lib/uploads";

const MB = 1024 * 1024;
const USER_ID = "usr_1";
const UUID = "0f8fad5b-d9cb-469f-a165-70867728950e";

describe("uploadKindFor", () => {
  it("maps only File and Image", () => {
    expect(uploadKindFor("Image")).toBe("image");
    expect(uploadKindFor("File")).toBe("file");
    expect(uploadKindFor("Snippet")).toBeNull();
    expect(uploadKindFor("image")).toBeNull();
  });
});

describe("validateUpload", () => {
  it("accepts every listed extension at the size limit", () => {
    expect(
      validateUpload("image", { fileName: "a.PNG", fileSize: 5 * MB }),
    ).toBeNull();
    expect(
      validateUpload("file", { fileName: "notes.toml", fileSize: 10 * MB }),
    ).toBeNull();
  });

  it("refuses one byte over the limit for each kind", () => {
    expect(
      validateUpload("image", { fileName: "a.png", fileSize: 5 * MB + 1 }),
    ).toMatch(/too large — the limit is 5.0 MB/);
    expect(
      validateUpload("file", { fileName: "a.pdf", fileSize: 10 * MB + 1 }),
    ).toMatch(/too large — the limit is 10.0 MB/);
  });

  it("keeps the two kinds' extension lists apart", () => {
    expect(
      validateUpload("image", { fileName: "a.pdf", fileSize: 10 }),
    ).toMatch(/isn't supported/);
    expect(validateUpload("file", { fileName: "a.png", fileSize: 10 })).toMatch(
      /isn't supported/,
    );
  });

  it("refuses executables, missing extensions and prototype keys", () => {
    for (const fileName of [
      "a.exe",
      "a.html",
      "README",
      ".png",
      "a.constructor",
      "a.__proto__",
    ]) {
      expect(validateUpload("file", { fileName, fileSize: 10 })).toMatch(
        /isn't supported/,
      );
    }
  });

  it("refuses an empty or non-integer size", () => {
    expect(validateUpload("file", { fileName: "a.txt", fileSize: 0 })).toMatch(
      /empty/,
    );
    expect(
      validateUpload("file", { fileName: "a.txt", fileSize: 1.5 }),
    ).toMatch(/empty/);
  });

  it("refuses a reported type that contradicts the extension", () => {
    expect(
      validateUpload("image", {
        fileName: "a.png",
        fileSize: 10,
        mimeType: "text/html",
      }),
    ).toMatch(/don't match/);
  });

  it("tolerates a browser that reports no type at all", () => {
    expect(
      validateUpload("file", { fileName: "a.ini", fileSize: 10, mimeType: "" }),
    ).toBeNull();
  });
});

describe("sanitizeFileName", () => {
  it("strips paths, quotes and control characters but keeps the extension", () => {
    expect(sanitizeFileName("../../etc/passwd.txt")).toBe("passwd.txt");
    expect(sanitizeFileName("C:\\Users\\me\\a.pdf")).toBe("a.pdf");
    expect(sanitizeFileName('we"ird\nname.md')).toBe("we_ird_name.md");
  });

  it("drops leading dots so a name can't become hidden or relative", () => {
    expect(sanitizeFileName("...env.txt")).toBe("env.txt");
  });

  it("bounds the length and falls back to a stem", () => {
    expect(sanitizeFileName(`${"a".repeat(300)}.json`)).toBe(
      `${"a".repeat(100)}.json`,
    );
    expect(sanitizeFileName(".png")).toBe("png");
  });

  it("never splits a surrogate pair, so a second pass changes nothing", () => {
    const once = sanitizeFileName(`a${"𠀀".repeat(120)}.txt`);
    expect(sanitizeFileName(once)).toBe(once);
    expect(Array.from(once.slice(0, -4))).toHaveLength(100);
  });

  it("keeps non-ASCII letters", () => {
    expect(sanitizeFileName("résumé.pdf")).toBe("résumé.pdf");
  });
});

describe("buildObjectKey / fileNameFromKey", () => {
  it("round-trips a key built for the same user", () => {
    const key = buildObjectKey(USER_ID, "My Diagram.png", UUID);
    expect(key).toBe(`${USER_ID}/${UUID}/My Diagram.png`);
    expect(fileNameFromKey(USER_ID, key)).toBe("My Diagram.png");
  });

  it("refuses another user's key", () => {
    const key = buildObjectKey("usr_other", "a.png", UUID);
    expect(fileNameFromKey(USER_ID, key)).toBeNull();
  });

  it("refuses anything not shaped exactly as built", () => {
    for (const key of [
      `${USER_ID}/a.png`,
      `${USER_ID}/${UUID}/sub/a.png`,
      `${USER_ID}/../usr_other/a.png`,
      `${USER_ID}/not-a-uuid/a.png`,
      `${USER_ID}/${UUID}/..`,
      `${USER_ID}/${UUID}/`,
      `${USER_ID}/${UUID}/a"b.png`,
    ]) {
      expect(fileNameFromKey(USER_ID, key)).toBeNull();
    }
  });

  it("uses a fresh random segment by default", () => {
    expect(buildObjectKey(USER_ID, "a.png")).not.toBe(
      buildObjectKey(USER_ID, "a.png"),
    );
  });
});

describe("servingHeadersFor", () => {
  it("renders raster images inline unless a download is asked for", () => {
    expect(servingHeadersFor("a.png", false)).toEqual({
      contentType: "image/png",
      inline: true,
    });
    expect(servingHeadersFor("a.png", true).inline).toBe(false);
  });

  it("never serves SVG inline, since it can carry script", () => {
    expect(servingHeadersFor("a.svg", false)).toEqual({
      contentType: "image/svg+xml",
      inline: false,
    });
  });

  it("serves text formats as plain text and unknowns as opaque bytes", () => {
    expect(servingHeadersFor("a.md", false).contentType).toBe(
      "text/plain; charset=utf-8",
    );
    expect(servingHeadersFor("a.html", false)).toEqual({
      contentType: "application/octet-stream",
      inline: false,
    });
    expect(servingHeadersFor("a.constructor", false).contentType).toBe(
      "application/octet-stream",
    );
  });
});

describe("contentDisposition", () => {
  it("gives an ASCII fallback plus the encoded UTF-8 name", () => {
    expect(contentDisposition("résumé.pdf", false)).toBe(
      "attachment; filename=\"r_sum_.pdf\"; filename*=UTF-8''r%C3%A9sum%C3%A9.pdf",
    );
  });

  it("can't be broken out of by a quote in the name", () => {
    expect(contentDisposition('a".png', true)).toMatch(
      /^inline; filename="a_\.png"/,
    );
  });
});

describe("acceptAttribute", () => {
  it("lists the kind's extensions for the file picker", () => {
    expect(acceptAttribute("image")).toBe(".png,.jpg,.jpeg,.gif,.webp,.svg");
  });
});
