import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { practiceApi } from "@/lib/practice/api";
import type { ConversationSearchPage } from "@/lib/practice/contracts";
import { ConversationSearchCard } from "./conversation-search-card";

type AttachmentFilter = "any" | "with" | "without";

/** Search persisted titles/messages with hybrid ranking, filters and highlighted result cards. */
export function ConversationSearch({
  query: initialQuery,
  includeArchived: initialArchived,
  onClose,
  onSelect,
}: {
  query: string;
  includeArchived: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const [scope, setScope] = useState<"active" | "archived" | "all">(
    initialArchived ? "all" : "active",
  );
  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");
  const [attachmentFilter, setAttachmentFilter] =
    useState<AttachmentFilter>("any");
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const result = useInfiniteQuery({
    queryKey: [
      "practice",
      "search",
      debounced,
      scope,
      updatedFrom,
      updatedTo,
      attachmentFilter,
    ],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => {
      const parameters = new URLSearchParams({
        query: debounced,
        scope,
        page: String(pageParam),
      });
      if (updatedFrom) parameters.set("updatedFrom", updatedFrom);
      if (updatedTo) parameters.set("updatedTo", updatedTo);
      if (attachmentFilter !== "any")
        parameters.set("hasAttachments", String(attachmentFilter === "with"));
      return practiceApi<ConversationSearchPage>(`/threads?${parameters}`, {
        signal,
      });
    },
    getNextPageParam: (page) => (page.hasMore ? page.page + 1 : undefined),
  });
  const select = (id: string) => {
    onSelect(id);
    onClose();
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search conversations</DialogTitle>
          <DialogDescription>
            Hybrid semantic and full-text search across saved titles and
            messages.
          </DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          aria-label="Search saved conversations"
          value={query}
          maxLength={200}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try forest spirits or weekend plans…"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            Conversation status
            <select
              aria-label="Conversation search scope"
              className="w-full rounded border bg-background p-2"
              value={scope}
              onChange={(event) => setScope(event.target.value as typeof scope)}
            >
              <option value="active">Active conversations</option>
              <option value="archived">Archived conversations</option>
              <option value="all">All conversations</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            Attachments
            <select
              aria-label="Attachment filter"
              className="w-full rounded border bg-background p-2"
              value={attachmentFilter}
              onChange={(event) =>
                setAttachmentFilter(event.target.value as AttachmentFilter)
              }
            >
              <option value="any">With or without files</option>
              <option value="with">Has attachments</option>
              <option value="without">No attachments</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            Updated from
            <Input
              type="date"
              aria-label="Updated from"
              value={updatedFrom}
              max={updatedTo || undefined}
              onChange={(event) => setUpdatedFrom(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            Updated to
            <Input
              type="date"
              aria-label="Updated to"
              value={updatedTo}
              min={updatedFrom || undefined}
              onChange={(event) => setUpdatedTo(event.target.value)}
            />
          </label>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            {result.data?.pages[0].searchMode === "hybrid"
              ? "Semantic + full-text ranking"
              : result.data?.pages[0].searchMode === "lexical"
                ? "Full-text ranking (semantic provider unavailable)"
                : "Filtered conversations"}
          </span>
          {(updatedFrom || updatedTo || attachmentFilter !== "any") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setUpdatedFrom("");
                setUpdatedTo("");
                setAttachmentFilter("any");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
        <div
          className="max-h-[48dvh] space-y-3 overflow-y-auto"
          aria-live="polite"
        >
          {result.isPending && <p>Searching…</p>}
          {result.error && (
            <div role="alert" className="space-y-2">
              <p>{result.error.message}</p>
              <Button variant="outline" onClick={() => void result.refetch()}>
                Retry
              </Button>
            </div>
          )}
          {result.data?.pages[0].total === 0 && (
            <p className="text-muted-foreground">No matching conversations.</p>
          )}
          {result.data?.pages
            .flatMap((page) => page.items)
            .map((thread) => (
              <ConversationSearchCard
                key={thread.id}
                result={thread}
                onOpen={select}
              />
            ))}
          {result.hasNextPage && (
            <Button
              variant="outline"
              disabled={result.isFetchingNextPage}
              onClick={() => void result.fetchNextPage()}
            >
              More results
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
