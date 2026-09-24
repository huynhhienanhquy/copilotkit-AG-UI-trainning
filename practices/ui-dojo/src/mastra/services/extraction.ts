import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { StringDecoder } from "node:string_decoder";
import { z } from "zod";
import { PracticeError } from "./practice-errors";

export const extractedDocumentSchema = z.object({ text: z.string().max(2_000_000),
  pages: z.array(z.object({ page: z.number(), start: z.number(), end: z.number() })) });
export type ExtractedDocument = z.infer<typeof extractedDocumentSchema>;
let running = 0;

/** Locate the shipped worker from source, Mastra's nested output, or an explicit deployment path. */
function workerPath(): string | undefined {
  if (process.env.PRACTICE_EXTRACTOR_PATH) return resolve(process.env.PRACTICE_EXTRACTOR_PATH);
  for (const base of [dirname(fileURLToPath(import.meta.url)), process.cwd()]) {
    let directory = base;
    for (let level = 0; level < 7; level++) {
      const candidate = resolve(directory, "scripts/extract-document.mjs");
      if (existsSync(candidate)) return candidate;
      const parent = dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }
  }
}

/** Parse untrusted documents outside the server with a deadline, heap cap and bounded output. */
export async function extractDocument(buffer: Buffer, kind: string): Promise<ExtractedDocument> {
  if (running >= 2) throw new PracticeError("busy", "Two files are being processed. Please try again shortly.", 409);
  running++;
  try {
    // Mastra dev/start may execute with .mastra/output as cwd. Resolve only trusted application paths.
    const worker = workerPath();
    if (!worker || !existsSync(worker)) throw new PracticeError("extractor_unavailable", "Document extractor is missing from this installation", 500);
    return await new Promise((resolveResult, reject) => {
      const child = spawn(process.execPath, ["--max-old-space-size=256",
        worker, kind],
      { windowsHide: true, stdio: ["pipe", "pipe", "pipe"], env: {
        PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP,
      } });
      let output = "";
      const decoder = new StringDecoder("utf8");
      let diagnostic = "";
      let failure: PracticeError | undefined;
      const timer = setTimeout(() => {
        failure = new PracticeError("extraction_timeout", "Extraction exceeded 20 seconds. Try a smaller document.", 400);
        child.kill();
      }, 20_000);
      child.stdout.on("data", (chunk: Buffer) => {
        output += decoder.write(chunk);
        if (output.length > 8_000_000) { failure = new PracticeError("too_large", "Extracted text is too large", 413); child.kill(); }
      });
      child.stderr.on("data", (chunk: Buffer) => { if (diagnostic.length < 16_000) diagnostic += chunk.toString(); });
      child.on("error", () => { clearTimeout(timer); reject(new PracticeError("extractor_unavailable", "The document extractor could not start", 500)); });
      child.on("close", (code) => {
        output += decoder.end();
        clearTimeout(timer);
        if (failure) return reject(failure);
        if (code !== 0) return reject(new PracticeError("extraction_failed", diagnostic.includes("no_text_requires_ocr")
          ? "This PDF has no readable text. OCR is required and is not supported in this practice."
          : "This file could not be read. It may be damaged, encrypted, empty or exceed extraction limits.", 400));
        try { resolveResult(extractedDocumentSchema.parse(JSON.parse(output))); }
        catch { reject(new PracticeError("extraction_failed", "The extractor returned an invalid result", 500)); }
      });
      child.stdin.on("error", () => { /* The close/error handler reports early parser exit. */ });
      child.stdin.end(buffer);
    });
  } finally { running--; }
}
