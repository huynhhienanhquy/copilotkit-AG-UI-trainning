import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { migratePractice } from "../../repositories/practice-database";
import { AttachmentService } from "../attachments";
import { WatchlistService } from "../watchlist";
import { boundedRequest } from "../request-body";

let directory: string;
let database: Client;
let url: string;
beforeEach(async () => {
  directory = await mkdtemp(join(process.env.PRACTICE_TEST_ROOT || tmpdir(), "ui-dojo-business-"));
  url = `file:${join(directory, "test.db").replaceAll("\\", "/")}`;
  database = createClient({ url });
  await migratePractice(database);
});
afterEach(() => { database.close(); });

it("keeps an idempotent resource-scoped watchlist through database reopen and catalog failure", async () => {
  const film = { id: randomUUID(), title: "Totoro", description: "Fixture", image: "https://example.com/totoro.jpg", releaseYear: "1988" };
  const service = new WatchlistService(database, "one", async () => [film]);
  const results = await Promise.all([service.add(film.id), service.add(film.id)]);
  expect(results.map((item) => item.status).sort()).toEqual(["added", "already_exists"]);
  expect(await new WatchlistService(database, "two").list()).toEqual([]);
  await expect(service.add(randomUUID())).rejects.toMatchObject({ code: "not_found" });
  database.close(); database = createClient({ url });
  const reopened = new WatchlistService(database, "one", async () => { throw new Error("offline"); });
  expect(await reopened.list()).toEqual([expect.objectContaining(film)]);
  await expect(reopened.add(film.id)).rejects.toThrow("offline");
  expect(await reopened.remove(film.id)).toMatchObject({ status: "removed" });
  expect(await reopened.remove(film.id)).toMatchObject({ status: "not_found" });
});

it("persists files, bindings and chunked extraction; isolates resources and cleans thread files", async () => {
  const text = "Tài liệu Totoro 🌿\n".repeat(3000);
  const parser = vi.fn(async () => ({ text, pages: [{ page: 1, start: 0, end: text.length }] }));
  const service = new AttachmentService(database, "one", directory, parser);
  const thread = randomUUID(); const message = randomUUID();
  const file = await service.upload(thread, "../../weekend.md", Buffer.from(text));
  expect(file.filename).toBe("weekend.md");
  expect((await service.read(file.id)).buffer.toString()).toBe(text);
  await expect(new AttachmentService(database, "two", directory).read(file.id)).rejects.toMatchObject({ code: "not_found" });
  await expect(service.bind(randomUUID(), message, [file.id])).rejects.toMatchObject({ code: "not_found" });
  await service.bind(thread, message, [file.id]);
  await service.bind(thread, message, [file.id]);
  await expect(service.bind(thread, randomUUID(), [file.id])).rejects.toMatchObject({ code: "not_found" });
  const first = await service.extract(file.id);
  const second = await service.extract(file.id, first.nextOffset!);
  expect(first.text + second.text).toBe(text.slice(0, 40_000));
  expect(first.pages[0].page).toBe(1);
  expect(parser).toHaveBeenCalledTimes(1);
  await expect(service.remove(file.id)).rejects.toMatchObject({ code: "attached" });
  database.close(); database = createClient({ url });
  const reopened = new AttachmentService(database, "one", directory, parser);
  expect((await reopened.list(thread))[0].messageId).toBe(message);
  expect((await reopened.extract(file.id)).text).toBe(first.text);
  expect(parser).toHaveBeenCalledTimes(1);
  await reopened.deleteThread(thread);
  expect(await reopened.list(thread)).toEqual([]);
  await expect(reopened.read(file.id)).rejects.toMatchObject({ code: "not_found" });
});

it("rejects oversized, spoofed, unsupported and invalid UTF-8 uploads before writing", async () => {
  const service = new AttachmentService(database, "one", directory);
  const thread = randomUUID();
  for (const [name, buffer, code] of [
    ["large.txt", Buffer.alloc(10 * 1024 * 1024 + 1), "too_large"],
    ["fake.pdf", Buffer.from("Hello"), "invalid_file"],
    ["fake.docx", Buffer.from("P"), "invalid_file"],
    ["bad.txt", Buffer.from([255]), "invalid_text"],
    ["file.exe", Buffer.from("MZ"), "unsupported"],
  ] as const) await expect(service.upload(thread, name, buffer)).rejects.toMatchObject({ code });
  expect(await service.list(thread)).toEqual([]);
});

it("bounds chunked request bodies even when Content-Length is absent", async () => {
  const chunks = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(8)); controller.enqueue(new Uint8Array(8)); controller.close(); } });
  const request = new Request("http://localhost/upload", { method: "POST", body: chunks, duplex: "half" } as RequestInit);
  await expect(boundedRequest(request, 10)).rejects.toMatchObject({ status: 413 });
  const valid = await boundedRequest(new Request("http://localhost/api", { method: "POST", body: "hello" }), 10);
  expect(await valid.text()).toBe("hello");
});
