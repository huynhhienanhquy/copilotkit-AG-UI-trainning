import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { practiceApi } from "@/lib/practice/api";
import type { Film, WatchlistItem } from "@/lib/practice/contracts";

/** Show current saved films; buttons and agent tools share the same backend service. */
export function WatchlistPanel({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const list = useQuery({ queryKey: ["practice", "watchlist"], queryFn: ({ signal }) => practiceApi<WatchlistItem[]>("/watchlist", { signal }) });
  const catalog = useQuery({ queryKey: ["practice", "films"], queryFn: ({ signal }) => practiceApi<Film[]>("/films", { signal }) });
  const mutation = useMutation({ mutationFn: ({ id, method }: { id: string; method: "PUT" | "DELETE" }) => practiceApi(`/watchlist/${id}`, { method }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["practice", "watchlist"] }) });
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
    <DialogHeader><DialogTitle>Your Ghibli watchlist</DialogTitle><DialogDescription>Saved across all your conversations. Ask the agent to add or remove films, or use the controls below.</DialogDescription></DialogHeader>
    {list.isPending && <p role="status">Loading watchlist…</p>}
    {(list.error || mutation.error) && <p role="alert">{list.error?.message || mutation.error?.message}</p>}
    {list.error && <Button onClick={() => void list.refetch()}>Retry watchlist</Button>}
    {list.data?.length === 0 && <p className="text-muted-foreground">Your watchlist is empty. Find a film below to get started.</p>}
    <ul className="space-y-3">{list.data?.map((film) => <li key={film.id} className="flex items-center gap-3 rounded-lg border p-3">
      <img src={film.image} alt="" className="h-16 w-11 rounded object-cover" loading="lazy" />
      <div className="min-w-0 flex-1"><p className="font-medium">{film.title}</p><p className="text-sm text-muted-foreground">{film.releaseYear}</p></div>
      <Button variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: film.id, method: "DELETE" })} aria-label={`Remove ${film.title}`}>Remove</Button>
    </li>)}</ul>
    <Input aria-label="Find a Ghibli film" placeholder="Find a film to add…" value={search} onChange={(event) => setSearch(event.target.value)} />
    {catalog.error && <div role="alert">{catalog.error.message}<Button onClick={() => void catalog.refetch()}>Retry catalog</Button></div>}
    {catalog.isPending && <p role="status">Loading films…</p>}
    <ul className="space-y-2">{catalog.data?.filter((film) => film.title.toLowerCase().includes(search.toLowerCase())).map((film) => <li key={film.id} className="flex items-center justify-between gap-3">
      <span>{film.title} <span className="text-sm text-muted-foreground">({film.releaseYear})</span></span>
      <Button size="sm" variant="secondary" disabled={mutation.isPending || list.isPending || list.data?.some((item) => item.id === film.id)} onClick={() => mutation.mutate({ id: film.id, method: "PUT" })} aria-label={`Add ${film.title}`}>{list.data?.some((item) => item.id === film.id) ? "Added" : "Add"}</Button>
    </li>)}</ul>
  </DialogContent></Dialog>;
}
