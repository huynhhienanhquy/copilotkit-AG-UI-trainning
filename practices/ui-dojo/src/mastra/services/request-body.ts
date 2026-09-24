import { PracticeError } from "./practice-errors";

/** Enforce a byte limit while reading, including chunked requests without Content-Length. */
export async function boundedRequest(request: Request, maximum: number): Promise<Request> {
  if (Number(request.headers.get("content-length")) > maximum) throw new PracticeError("too_large", "Request exceeds the upload limit", 413);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  const reader = request.body?.getReader();
  if (reader) {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maximum) { await reader.cancel(); throw new PracticeError("too_large", "Request exceeds the upload limit", 413); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
  }
  return new Request(request.url, { method: request.method, headers: request.headers, body: Buffer.concat(chunks) });
}
