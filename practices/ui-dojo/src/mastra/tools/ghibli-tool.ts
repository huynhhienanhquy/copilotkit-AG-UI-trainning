import { createTool } from "@mastra/core/tools";
import { z } from "zod";

async function fetchJson(id: string) {
  const url = new URL(id);
  if (url.origin !== "https://ghibliapi.vercel.app" || !/^\/(films|people)(\/[a-f0-9-]+)?$/.test(url.pathname)) throw new Error("Unsupported Ghibli endpoint");
  const response = await fetch(id, {
    signal: AbortSignal.timeout(10_000),
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) throw new Error("Ghibli catalog is temporarily unavailable");
  return response.json();
}

export const ghibliFilms = createTool({
  id: "ghibli-films",
  description: "Get information about Ghibli films",
  inputSchema: z.object({}),
  execute: async () => {
    const films = z.array(z.object({ id: z.string().uuid(), title: z.string(), description: z.string(), movie_banner: z.string().url(), release_date: z.string() })).parse(await fetchJson(`https://ghibliapi.vercel.app/films`));

    return films.map(
      (film: {
        id: string;
        title: string;
        description: string;
        movie_banner: string;
        release_date: string;
      }) => ({
        id: film.id,
        title: film.title,
        description: film.description,
        movie_banner: film.movie_banner,
        release_date: film.release_date,
      }),
    );
  },
});

export const ghibliCharacters = createTool({
  id: "ghibli-characters",
  description: "Get information about Ghibli characters",
  inputSchema: z.object({}),
  execute: async () => {
    const characters = z.array(z.object({ name: z.string(), gender: z.string(), age: z.union([z.string(), z.number()]), eye_color: z.string(), films: z.array(z.string().url()) })).parse(await fetchJson(`https://ghibliapi.vercel.app/people`));
    const films = z.array(z.object({ id: z.string().uuid(), title: z.string() })).parse(await fetchJson("https://ghibliapi.vercel.app/films"));

    return await Promise.all(
      characters.map(
        async (character: {
          name: string;
          gender: string;
          age: string | number;
          eye_color: string;
          films: string[];
        }) => ({
          name: character.name,
          gender: character.gender,
          age: character.age,
          eye_color: character.eye_color,
          films: await Promise.all(
            character.films.map(async (filmUrl: string) => {
              const film = films.find((item) => filmUrl === `https://ghibliapi.vercel.app/films/${item.id}`);
              return {
                title: film?.title || "Unknown film",
              };
            }),
          ),
        }),
      ),
    );
  },
});
