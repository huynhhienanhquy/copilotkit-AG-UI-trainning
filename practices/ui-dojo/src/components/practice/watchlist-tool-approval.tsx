import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { practiceApi } from "@/lib/practice/api";
import { idSchema, type Film } from "@/lib/practice/contracts";
import { WatchlistApprovalCard } from "./watchlist-approval-card";

type Props = {
  action: "add" | "remove";
  filmId?: string;
  status: "inProgress" | "executing" | "complete";
  result?: string;
  onApprove?: (film: Film) => Promise<void>;
  onDecline?: (film?: Film) => Promise<void>;
};

/** Historical labels come only from recorded canonical data, never tool arguments. */
function recordedTitle(result: string | undefined, filmId: string | undefined) {
  try {
    const value = JSON.parse(result || "null");
    const film = value?.film ?? value?.result?.film;
    return film?.id === filmId && typeof film?.title === "string"
      ? film.title
      : undefined;
  } catch {
    return undefined;
  }
}

/** Resolve the actual mutation target before offering approval. Reads never change data. */
export function WatchlistToolApproval({
  action,
  filmId,
  status,
  result,
  onApprove,
  onDecline,
}: Props) {
  const validId = idSchema.safeParse(filmId).success;
  const source = useQuery({
    queryKey: ["practice", action === "add" ? "films" : "watchlist"],
    queryFn: ({ signal }) =>
      practiceApi<Film[]>(action === "add" ? "/films" : "/watchlist", {
        signal,
      }),
    enabled: status === "executing" && validId,
    staleTime: action === "add" ? 300_000 : 0,
    retry: false,
  });
  const film = source.data?.find((item) => item.id === filmId);
  const checking = status === "executing" && validId && source.isFetching;
  const resolutionError =
    status !== "executing" || checking
      ? undefined
      : !validId
        ? "A valid film ID is required."
        : (source.error?.message ??
          (!source.isPending && !film
            ? action === "add"
              ? "Film not found in the Ghibli catalog."
              : "Film not found in your watchlist."
            : undefined));
  const canApprove = Boolean(
    film && !checking && !resolutionError && onApprove,
  );

  return (
    <div>
      <WatchlistApprovalCard
        action={action}
        filmId={filmId}
        filmTitle={
          status === "complete" ? recordedTitle(result, filmId) : film?.title
        }
        status={status}
        result={result}
        onApprove={
          canApprove && film && onApprove
            ? async () => onApprove(film)
            : undefined
        }
        onDecline={onDecline ? async () => onDecline(film) : undefined}
      />
      {checking && <p role="status">Checking film details…</p>}
      {resolutionError && (
        <div role="alert" className="space-y-2 text-sm text-destructive">
          <p>{resolutionError}</p>
          {validId && (
            <Button variant="outline" onClick={() => void source.refetch()}>
              Retry film lookup
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
