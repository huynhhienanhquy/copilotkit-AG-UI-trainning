import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { practiceApi } from "@/lib/practice/api";
import type { Conversation, Page } from "@/lib/practice/contracts";

/** Search persisted titles/text with cancellation, archive filtering and keyboard-accessible results. */
export function ConversationSearch({ query: initialQuery, includeArchived: initialArchived, onClose, onSelect }: {
  query: string; includeArchived: boolean; onClose: () => void; onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const [scope, setScope] = useState<"active" | "archived" | "all">(initialArchived ? "all" : "active");
  useEffect(() => { const timer = setTimeout(() => setDebounced(query), 250); return () => clearTimeout(timer); }, [query]);
  const result = useInfiniteQuery({ queryKey: ["practice", "search", debounced, scope], initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => practiceApi<Page<Conversation>>(`/threads?query=${encodeURIComponent(debounced)}&scope=${scope}&page=${pageParam}`, { signal }),
    getNextPageParam: (page) => page.hasMore ? page.page + 1 : undefined });
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="sm:max-w-xl">
    <DialogHeader><DialogTitle>Search conversations</DialogTitle><DialogDescription>Search titles and saved messages. Select a conversation to open it.</DialogDescription></DialogHeader>
    <Input autoFocus aria-label="Search saved conversations" value={query} maxLength={200} onChange={(event) => setQuery(event.target.value)} placeholder="Try Totoro or weekend…" />
    <label className="flex items-center gap-2 text-sm">Search in<select aria-label="Conversation search scope" className="rounded border bg-background p-2" value={scope} onChange={(event) => setScope(event.target.value as typeof scope)}><option value="active">Active conversations</option><option value="archived">Archived conversations</option><option value="all">All conversations</option></select></label>
    <div className="max-h-80 space-y-2 overflow-y-auto" aria-live="polite">
      {result.isPending && <p>Searching…</p>}
      {result.error && <div role="alert">{result.error.message}<Button variant="outline" onClick={() => void result.refetch()}>Retry</Button></div>}
      {result.data?.pages[0].total === 0 && <p className="text-muted-foreground">No matching conversations.</p>}
      {result.data?.pages.flatMap((page) => page.items).map((thread) => <Button key={thread.id} variant="ghost" className="h-auto w-full flex-col items-start gap-1 whitespace-normal text-left" onClick={() => { onSelect(thread.id); onClose(); }}>
        <span className="font-medium">{thread.title}{thread.archivedAt ? " · Archived" : ""}</span>
        {thread.snippet && <span className="text-xs text-muted-foreground">{thread.snippet}</span>}
        <span className="text-xs text-muted-foreground">{new Date(thread.updatedAt).toLocaleString()}</span>
      </Button>)}
      {result.hasNextPage && <Button variant="outline" disabled={result.isFetchingNextPage} onClick={() => void result.fetchNextPage()}>More results</Button>}
    </div>
  </DialogContent></Dialog>;
}
