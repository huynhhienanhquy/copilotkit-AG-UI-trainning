import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UndoToastRequest } from "@/components/practice/undo-toast";
import { practiceApi } from "./api";
import type { Film, WatchlistItem } from "./contracts";
import { updateWatchlist } from "./optimistic-updates";
import { acquireMutationQueue } from "./mutation-queue";

type Variables = {
  filmId: string;
  film?: Film;
  method: "PUT" | "DELETE";
  announce?: boolean;
};

type Result =
  | { status: "added" | "already_exists"; film: Film }
  | { status: "removed" | "not_found"; filmId: string };

type Context = { previous: WatchlistItem[]; film?: Film; release: () => void };

const watchlistKey = ["practice", "watchlist"] as const;

/** Share optimistic updates and rollback between direct controls and approved agent writes. */
export function useWatchlistMutation(
  showUndo: (request: UndoToastRequest) => void,
) {
  const client = useQueryClient();
  const mutation = useMutation<Result, Error, Variables, Context>({
    mutationFn: ({ filmId, method }) =>
      practiceApi<Result>(`/watchlist/${filmId}`, { method }),
    onMutate: async ({ filmId, film: requestedFilm, method }) => {
      const release = await acquireMutationQueue(client, "watchlist");
      try {
        await client.cancelQueries({ queryKey: watchlistKey });
        let previous = client.getQueryData<WatchlistItem[]>(watchlistKey);
        if (!previous) {
          previous = await practiceApi<WatchlistItem[]>("/watchlist");
          client.setQueryData(watchlistKey, previous);
        }
        let film = requestedFilm ?? previous.find((item) => item.id === filmId);
        if (!film && method === "PUT") {
          const catalog = await client.fetchQuery({
            queryKey: ["practice", "films"],
            queryFn: ({ signal }) => practiceApi<Film[]>("/films", { signal }),
            staleTime: 300_000,
          });
          film = catalog.find((item) => item.id === filmId);
          if (!film) throw new Error("Film not found in the Ghibli catalog");
        }
        const resolvedFilm = film;
        if (resolvedFilm)
          client.setQueryData<WatchlistItem[]>(watchlistKey, (items) =>
            updateWatchlist(
              items,
              resolvedFilm,
              method === "PUT",
              new Date().toISOString(),
            ),
          );
        return { previous, film, release };
      } catch (failure) {
        release();
        throw failure;
      }
    },
    onSuccess: (result, { filmId, method, announce = true }, context) => {
      const film = "film" in result ? result.film : context?.film;
      if (
        !announce ||
        !film ||
        (result.status !== "added" && result.status !== "removed")
      )
        return;
      showUndo({
        message: `${film.title} ${method === "PUT" ? "added to" : "removed from"} watchlist`,
        onUndo: async () => {
          await mutation.mutateAsync({
            filmId,
            film,
            method: method === "PUT" ? "DELETE" : "PUT",
            announce: false,
          });
        },
      });
    },
    onError: (_failure, _variables, context) => {
      if (context) client.setQueryData(watchlistKey, context.previous);
    },
    onSettled: async (_data, _error, _variables, context) => {
      try {
        await client.invalidateQueries({ queryKey: watchlistKey });
      } finally {
        context?.release();
      }
    },
  });
  return mutation;
}
