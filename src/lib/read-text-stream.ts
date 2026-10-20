/**
 * Reads a plain-text response body to the end, handing `onChunk` each piece
 * as it decodes. A multi-byte character split across two network chunks is
 * held back until it's whole, and flushed at the end. Rejects if the stream
 * errors or is aborted partway.
 */
export async function readTextStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (chunk: string) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) onChunk(chunk);
  }
  const tail = decoder.decode();
  if (tail) onChunk(tail);
}
