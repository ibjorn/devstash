import { describe, expect, it } from "vitest";

import { readTextStream } from "@/lib/read-text-stream";

// Pull-based, so an error lands after the chunks are read — erroring a
// stream discards whatever is still queued
function streamOf(chunks: Uint8Array[], error?: Error) {
  const queue = [...chunks];
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      const next = queue.shift();
      if (next) controller.enqueue(next);
      else if (error) controller.error(error);
      else controller.close();
    },
  });
}

const encode = (text: string) => new TextEncoder().encode(text);

async function collect(body: ReadableStream<Uint8Array>) {
  const chunks: string[] = [];
  await readTextStream(body, (chunk) => chunks.push(chunk));
  return chunks;
}

describe("readTextStream", () => {
  it("hands over each chunk in order", async () => {
    const chunks = await collect(streamOf([encode("Hello, "), encode("world")]));
    expect(chunks).toEqual(["Hello, ", "world"]);
  });

  it("holds a split multi-byte character until it's whole", async () => {
    const bytes = encode("café");
    const chunks = await collect(
      streamOf([bytes.slice(0, -1), bytes.slice(-1)]),
    );
    expect(chunks).toEqual(["caf", "é"]);
  });

  it("flushes a character left incomplete at the end", async () => {
    const bytes = encode("é");
    const chunks = await collect(streamOf([bytes.slice(0, 1)]));
    expect(chunks).toEqual(["�"]);
  });

  it("handles an empty body", async () => {
    expect(await collect(streamOf([]))).toEqual([]);
  });

  it("rejects when the stream breaks partway, after what arrived", async () => {
    const chunks: string[] = [];
    await expect(
      readTextStream(streamOf([encode("partial")], new Error("reset")), (c) =>
        chunks.push(c),
      ),
    ).rejects.toThrow("reset");
    expect(chunks).toEqual(["partial"]);
  });
});
