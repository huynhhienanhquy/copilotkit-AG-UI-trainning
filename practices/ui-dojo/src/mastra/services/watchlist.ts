import type { Client } from "@libsql/client";
import { z } from "zod";
import type { Film, WatchlistItem } from "../../lib/practice/contracts";
import { PracticeError } from "./practice-errors";

const catalogSchema = z.array(z.object({
  id: z.string().uuid(), title: z.string(), description: z.string(),
  image: z.string().url(), release_date: z.string(),
}));
let catalogCache: { films: Film[]; expiresAt: number } | undefined;

/** Fetch only the fixed Ghibli catalog endpoint; validate before models or UI use its data. */
export async function getFilmCatalog(): Promise<Film[]> {
  if (catalogCache && catalogCache.expiresAt > Date.now()) return catalogCache.films;
  try {
    const response = await fetch("https://ghibliapi.vercel.app/films", { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error("Catalog unavailable");
    const films = catalogSchema.parse(await response.json()).map((film) => ({
      id: film.id, title: film.title, description: film.description,
      image: film.image, releaseYear: film.release_date,
    }));
    catalogCache = { films, expiresAt: Date.now() + 300_000 };
    return films;
  } catch {
    throw new PracticeError("catalog_unavailable", "The Ghibli catalog is unavailable. Please try again.", 502);
  }
}

/** Shared UI/tool watchlist service; the unique database key makes repeated adds safe. */
export class WatchlistService {
  private readonly database: Client;
  private readonly resourceId: string;
  private readonly catalog: () => Promise<Film[]>;

  /** Inject the server resource and catalog provider; tests never need an external API. */
  constructor(database: Client, resourceId: string, catalog = getFilmCatalog) {
    this.database = database; this.resourceId = resourceId; this.catalog = catalog;
  }

  /** Read the current list across all of this resource's conversations. */
  async list(): Promise<WatchlistItem[]> {
    const result = await this.database.execute({ sql: "SELECT film_json, added_at FROM practice_watchlist WHERE resource_id = ? ORDER BY added_at DESC, film_id", args: [this.resourceId] });
    return result.rows.map((row) => ({ ...JSON.parse(String(row.film_json)) as Film, addedAt: String(row.added_at) }));
  }

  /** Add a real catalog film; invalid IDs cannot become invented watchlist items. */
  async add(filmId: string) {
    const film = (await this.catalog()).find((item) => item.id === filmId);
    if (!film) throw new PracticeError("not_found", "Film not found in the Ghibli catalog", 404);
    const result = await this.database.execute({
      sql: "INSERT OR IGNORE INTO practice_watchlist(resource_id, film_id, film_json, added_at) VALUES(?, ?, ?, ?)",
      args: [this.resourceId, film.id, JSON.stringify(film), new Date().toISOString()],
    });
    return { status: result.rowsAffected ? "added" : "already_exists", film };
  }

  /** Remove only this resource's item; repeating a removal is an explicit harmless result. */
  async remove(filmId: string) {
    const result = await this.database.execute({ sql: "DELETE FROM practice_watchlist WHERE resource_id = ? AND film_id = ?", args: [this.resourceId, filmId] });
    return { status: result.rowsAffected ? "removed" : "not_found", filmId };
  }
}
