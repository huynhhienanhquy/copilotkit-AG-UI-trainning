import { createClient, type Client } from "@libsql/client";

let client: Client | undefined;
let initialized: Promise<Client> | undefined;

/** Apply the additive practice schema in one transaction; existing Mastra tables are untouched. */
export async function migratePractice(database: Client): Promise<void> {
  await database.batch([
    `CREATE TABLE IF NOT EXISTS practice_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS practice_watchlist (
      resource_id TEXT NOT NULL, film_id TEXT NOT NULL, film_json TEXT NOT NULL,
      added_at TEXT NOT NULL, PRIMARY KEY(resource_id, film_id))`,
    `CREATE TABLE IF NOT EXISTS practice_attachments (
      id TEXT PRIMARY KEY, resource_id TEXT NOT NULL, thread_id TEXT NOT NULL,
      message_id TEXT, filename TEXT NOT NULL, media_type TEXT NOT NULL,
      size INTEGER NOT NULL CHECK(size > 0 AND size <= 10485760), created_at TEXT NOT NULL,
      extraction_json TEXT)`,
    `CREATE INDEX IF NOT EXISTS practice_attachments_thread ON practice_attachments(resource_id, thread_id)`,
    { sql: "INSERT OR IGNORE INTO practice_migrations(version, applied_at) VALUES(1, ?)", args: [new Date().toISOString()] },
  ], "write");
}

/** Open business tables using the same configured database as Mastra; failures remain retryable. */
export function getPracticeDatabase(): Promise<Client> {
  if (!initialized) {
    client ??= createClient({ url: process.env.TURSO_DATABASE_URL || "file:./.mastra-demo.db", authToken: process.env.TURSO_AUTH_TOKEN });
    const database = client;
    initialized = migratePractice(database).then(() => database).catch((error: unknown) => { initialized = undefined; throw error; });
  }
  return initialized;
}
