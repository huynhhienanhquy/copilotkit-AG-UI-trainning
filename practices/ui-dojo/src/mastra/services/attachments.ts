import type { Client, Row } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { basename, extname, resolve, sep } from "node:path";
import type { Attachment, Extraction } from "../../lib/practice/contracts";
import { EXTRACTION_CHUNK_SIZE, MAX_FILE_BYTES, MAX_MESSAGE_FILES, idSchema } from "../../lib/practice/contracts";
import { PracticeError } from "./practice-errors";
import { extractedDocumentSchema, extractDocument, type ExtractedDocument } from "./extraction";

const kinds: Record<string, { kind: string; mime: string }> = {
  ".txt": { kind: "text", mime: "text/plain" }, ".md": { kind: "text", mime: "text/markdown" },
  ".pdf": { kind: "pdf", mime: "application/pdf" },
  ".docx": { kind: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
};

/** Map public metadata without exposing storage paths or extracted content. */
function toAttachment(row: Row): Attachment {
  return { id: String(row.id), threadId: String(row.thread_id), messageId: row.message_id === null ? null : String(row.message_id),
    filename: String(row.filename), mediaType: String(row.media_type), size: Number(row.size), createdAt: String(row.created_at) };
}

/** Own durable files and extraction; callers must also validate the thread before uploads/binds. */
export class AttachmentService {
  private readonly database: Client;
  private readonly resourceId: string;
  private readonly directory: string;
  private readonly parser: typeof extractDocument;
  private readonly processing = new Map<string, Promise<ExtractedDocument>>();

  /** Inject an isolated directory/parser in tests; production uses a persistent configured directory. */
  constructor(database: Client, resourceId: string, directory: string, parser = extractDocument) {
    this.database = database; this.resourceId = resourceId; this.directory = resolve(directory); this.parser = parser;
  }

  /** Resolve only server-generated UUID filenames below the configured upload directory. */
  private filePath(id: string): string {
    idSchema.parse(id);
    const path = resolve(this.directory, id);
    if (!path.startsWith(this.directory + sep)) throw new PracticeError("not_found", "File not found", 404);
    return path;
  }

  /** Read an owned file row; unknown/foreign IDs are indistinguishable. */
  private async row(id: string): Promise<Row> {
    const result = await this.database.execute({ sql: "SELECT * FROM practice_attachments WHERE id = ? AND resource_id = ?", args: [id, this.resourceId] });
    if (!result.rows[0]) throw new PracticeError("not_found", "Attachment not found", 404);
    return result.rows[0];
  }

  /** List all thread attachments so old files remain discoverable after reload. */
  async list(threadId: string): Promise<Attachment[]> {
    const result = await this.database.execute({ sql: "SELECT * FROM practice_attachments WHERE resource_id = ? AND thread_id = ? ORDER BY created_at, id", args: [this.resourceId, threadId] });
    return result.rows.map(toAttachment);
  }

  /** Persist a supported file after validating size and magic bytes, with rollback on DB failure. */
  async upload(threadId: string, name: string, buffer: Buffer): Promise<Attachment> {
    const filename = Array.from(basename(name.replaceAll("\\", "/"))).filter((character) => character.charCodeAt(0) >= 32).join("").slice(0, 180);
    const format = kinds[extname(filename).toLowerCase()];
    if (!format) throw new PracticeError("unsupported", "Supported files: TXT, Markdown, PDF and DOCX", 415);
    if (!buffer.length || buffer.length > MAX_FILE_BYTES) throw new PracticeError("too_large", "Choose a nonempty file no larger than 10 MiB", 413);
    if (format.kind === "pdf" && !buffer.subarray(0, 1024).includes(Buffer.from("%PDF-")) ||
      format.kind === "docx" && (buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50)) throw new PracticeError("invalid_file", "The file contents do not match its extension", 415);
    if (format.kind === "text") {
      try { if (new TextDecoder("utf-8", { fatal: true }).decode(buffer).includes("\u0000")) throw new Error(); }
      catch { throw new PracticeError("invalid_text", "Text files must contain UTF-8 text", 415); }
    }
    const id = randomUUID();
    await mkdir(this.directory, { recursive: true });
    await writeFile(this.filePath(id), buffer, { flag: "wx" });
    try {
      await this.database.execute({ sql: "INSERT INTO practice_attachments(id, resource_id, thread_id, filename, media_type, size, created_at) VALUES(?, ?, ?, ?, ?, ?, ?)",
        args: [id, this.resourceId, threadId, filename, format.mime, buffer.length, new Date().toISOString()] });
    } catch (error) { await unlink(this.filePath(id)); throw error; }
    return toAttachment(await this.row(id));
  }

  /** Validate the entire batch before any durable message or binding is written. */
  async validateBinding(threadId: string, messageId: string, ids: string[]): Promise<Attachment[]> {
    if (ids.length > MAX_MESSAGE_FILES || new Set(ids).size !== ids.length) throw new PracticeError("invalid_files", "Attach at most three different files");
    const files = await Promise.all(ids.map((id) => this.row(id)));
    if (files.some((row) => row.thread_id !== threadId || row.message_id && row.message_id !== messageId)) throw new PracticeError("not_found", "Attachment not available for this message", 404);
    return files.map(toAttachment);
  }

  /** Link up to three owned uploads to a stable user message; duplicate retries preserve the link. */
  async bind(threadId: string, messageId: string, ids: string[]): Promise<Attachment[]> {
    const files = await this.validateBinding(threadId, messageId, ids);
    if (ids.length) await this.database.batch(ids.map((id) => ({ sql: "UPDATE practice_attachments SET message_id = ? WHERE id = ? AND resource_id = ? AND thread_id = ?", args: [messageId, id, this.resourceId, threadId] })), "write");
    return files.map((file) => ({ ...file, messageId }));
  }

  /** Read bytes for preview/download only after resolving owned metadata. */
  async read(id: string): Promise<{ attachment: Attachment; buffer: Buffer }> {
    const attachment = toAttachment(await this.row(id));
    try { return { attachment, buffer: await readFile(this.filePath(id)) }; }
    catch { throw new PracticeError("file_missing", "This attachment's file is no longer available", 404); }
  }

  /** Extract once, cache complete text, and return a bounded chunk with explicit continuation. */
  async extract(id: string, offset = 0): Promise<Extraction> {
    const row = await this.row(id);
    let document: ExtractedDocument;
    if (row.extraction_json) document = extractedDocumentSchema.parse(JSON.parse(String(row.extraction_json)));
    else {
      let processing = this.processing.get(id);
      if (!processing) {
        processing = (async () => {
          const { buffer } = await this.read(id);
          const result = await this.parser(buffer, kinds[extname(String(row.filename)).toLowerCase()].kind);
          await this.database.execute({ sql: "UPDATE practice_attachments SET extraction_json = ? WHERE id = ? AND resource_id = ?", args: [JSON.stringify(result), id, this.resourceId] });
          return result;
        })();
        this.processing.set(id, processing);
      }
      try { document = await processing; } finally { this.processing.delete(id); }
    }
    if (!Number.isInteger(offset) || offset < 0 || offset > document.text.length) throw new PracticeError("invalid_offset", "Invalid text offset");
    const end = Math.min(offset + EXTRACTION_CHUNK_SIZE, document.text.length);
    return { attachmentId: id, filename: String(row.filename), text: document.text.slice(offset, end), offset,
      nextOffset: end < document.text.length ? end : null, totalCharacters: document.text.length,
      pages: document.pages.filter((page) => page.end > offset && page.start < end) };
  }

  /** Remove one draft or thread-owned file; missing bytes are a safe idempotent cleanup. */
  async remove(id: string, draftOnly = true): Promise<void> {
    const row = await this.row(id);
    if (draftOnly && row.message_id) throw new PracticeError("attached", "Delete the conversation to remove a saved attachment", 409);
    try { await unlink(this.filePath(id)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    await this.database.execute({ sql: "DELETE FROM practice_attachments WHERE id = ? AND resource_id = ?", args: [id, this.resourceId] });
  }

  /** Clean a deleted thread's files; watchlist data is independent and remains intact. */
  async deleteThread(threadId: string): Promise<void> {
    for (const file of await this.list(threadId)) await this.remove(file.id, false);
  }

  /** Reclaim abandoned drafts older than 24h during upload activity; saved attachments are retained. */
  async cleanupDrafts(): Promise<void> {
    const result = await this.database.execute({ sql: "SELECT id FROM practice_attachments WHERE resource_id = ? AND message_id IS NULL AND created_at < ?", args: [this.resourceId, new Date(Date.now() - 86_400_000).toISOString()] });
    for (const row of result.rows) await this.remove(String(row.id));
  }
}
