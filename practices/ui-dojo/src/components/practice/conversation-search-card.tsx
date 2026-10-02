import { Archive, FileText, Pin } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type {
  ConversationSearchResult,
  HighlightRange,
} from "@/lib/practice/contracts";

/** Render server-provided ranges without injecting HTML from persisted messages. */
function HighlightedText({
  text,
  ranges = [],
}: {
  text: string;
  ranges?: HighlightRange[];
}) {
  const valid = ranges
    .filter(
      (range) =>
        range.start >= 0 && range.end > range.start && range.end <= text.length,
    )
    .sort((left, right) => left.start - right.start);
  if (!valid.length) return <>{text}</>;
  const parts: ReactNode[] = [];
  let cursor = 0;
  valid.forEach((range, index) => {
    if (range.start > cursor) parts.push(text.slice(cursor, range.start));
    parts.push(
      <mark
        key={`${range.start}-${range.end}-${index}`}
        className="rounded bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-700"
      >
        {text.slice(range.start, range.end)}
      </mark>,
    );
    cursor = Math.max(cursor, range.end);
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

/** Shared interactive result card used by the search dialog and agent tool rendering. */
export function ConversationSearchCard({
  result,
  onOpen,
}: {
  result: ConversationSearchResult;
  onOpen: (id: string) => void;
}) {
  return (
    <article className="space-y-2 rounded-lg border bg-card p-3 text-card-foreground shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{result.title}</p>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {result.pinnedAt && (
              <span className="inline-flex items-center gap-1">
                <Pin className="size-3" />
                Pinned
              </span>
            )}
            {result.archivedAt && (
              <span className="inline-flex items-center gap-1">
                <Archive className="size-3" />
                Archived
              </span>
            )}
            {!!result.attachmentCount && (
              <span className="inline-flex items-center gap-1">
                <FileText className="size-3" />
                {result.attachmentCount} file
                {result.attachmentCount === 1 ? "" : "s"}
              </span>
            )}
            {result.matchSource && <span>Matched {result.matchSource}</span>}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => onOpen(result.id)}>
          Open
        </Button>
      </div>
      {result.snippet && (
        <p className="line-clamp-3 text-sm text-muted-foreground">
          <HighlightedText
            text={result.snippet}
            ranges={result.snippetHighlights}
          />
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Updated {new Date(result.updatedAt).toLocaleString()}
      </p>
    </article>
  );
}
