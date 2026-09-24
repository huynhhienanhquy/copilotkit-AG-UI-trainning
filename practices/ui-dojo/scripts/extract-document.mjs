// Runs in a bounded child process. Only bytes arrive on stdin; never accept paths or URLs.
import { extractRawText } from "mammoth";

const chunks = [];
let bytes = 0;
for await (const chunk of process.stdin) {
  bytes += chunk.length;
  if (bytes > 10 * 1024 * 1024) throw new Error("too_large");
  chunks.push(chunk);
}
const buffer = Buffer.concat(chunks);
const kind = process.argv[2];
let text = "";
const pages = [];
if (kind === "pdf") {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await getDocument({ data: new Uint8Array(buffer), isEvalSupported: false,
    useSystemFonts: false, useWorkerFetch: false, verbosity: 0 }).promise;
  if (document.numPages > 500) throw new Error("too_many_pages");
  try {
    for (let index = 1; index <= document.numPages; index++) {
      const page = await document.getPage(index);
      const content = await page.getTextContent();
      const start = text.length;
      text += content.items.filter((item) => "str" in item).map((item) => item.str + (item.hasEOL ? "\n" : " ")).join("") + "\n";
      pages.push({ page: index, start, end: text.length });
      if (text.length > 2_000_000) throw new Error("too_much_text");
      page.cleanup();
    }
  } finally { await document.destroy(); }
} else if (kind === "docx") {
  // Inspect central-directory sizes before a DOCX parser allocates decompressed content.
  let uncompressed = 0;
  let entries = 0;
  for (let index = 0; index + 46 <= buffer.length; index++) {
    if (buffer.readUInt32LE(index) !== 0x02014b50) continue;
    uncompressed += buffer.readUInt32LE(index + 24);
    entries++;
    if (uncompressed > 30 * 1024 * 1024 || entries > 2000) throw new Error("archive_too_large");
    index += 45 + buffer.readUInt16LE(index + 28) + buffer.readUInt16LE(index + 30) + buffer.readUInt16LE(index + 32);
  }
  if (!entries) throw new Error("invalid_docx");
  text = (await extractRawText({ buffer })).value;
} else {
  text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  if (text.includes("\u0000")) throw new Error("invalid_text");
}
if (!text.trim()) throw new Error(kind === "pdf" ? "no_text_requires_ocr" : "empty_document");
if (text.length > 2_000_000) throw new Error("too_much_text");
process.stdout.write(JSON.stringify({ text, pages }));
