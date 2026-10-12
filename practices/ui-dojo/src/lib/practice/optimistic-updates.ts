import type { InfiniteData } from "@tanstack/react-query";
import type {
  Conversation,
  Film,
  Page,
  ThreadPatch,
  WatchlistItem,
} from "./contracts";

const THREAD_PAGE_SIZE = 30;

/** Restore only fields that actually changed, including compound agent requests. */
export function conversationUndoPatch(
  previous: Conversation,
  patch: ThreadPatch,
): ThreadPatch | undefined {
  const inverse: ThreadPatch = {};
  if (patch.title !== undefined && patch.title !== previous.title)
    inverse.title = previous.title;
  if (
    patch.archived !== undefined &&
    patch.archived !== Boolean(previous.archivedAt)
  )
    inverse.archived = Boolean(previous.archivedAt);
  if (patch.pinned !== undefined && patch.pinned !== Boolean(previous.pinnedAt))
    inverse.pinned = Boolean(previous.pinnedAt);
  return Object.keys(inverse).length ? inverse : undefined;
}

/** Apply the same field semantics as the server while a thread mutation is pending. */
export function optimisticConversation(
  conversation: Conversation,
  patch: ThreadPatch,
  timestamp: string,
): Conversation {
  return {
    ...conversation,
    title: patch.title ?? conversation.title,
    archivedAt:
      patch.archived === undefined
        ? conversation.archivedAt
        : patch.archived
          ? conversation.archivedAt || timestamp
          : null,
    pinnedAt:
      patch.pinned === undefined
        ? conversation.pinnedAt
        : patch.pinned
          ? conversation.pinnedAt || timestamp
          : null,
    updatedAt: timestamp,
  };
}

function belongsToScope(
  conversation: Conversation,
  scope: "active" | "archived",
) {
  return scope === "archived"
    ? Boolean(conversation.archivedAt)
    : !conversation.archivedAt;
}

function compareConversations(left: Conversation, right: Conversation) {
  return (
    Number(Boolean(right.pinnedAt)) - Number(Boolean(left.pinnedAt)) ||
    right.updatedAt.localeCompare(left.updatedAt) ||
    left.id.localeCompare(right.id)
  );
}

/** Rebuild loaded infinite-query pages so archive and pin changes appear immediately. */
export function updateConversationPages(
  data: InfiniteData<Page<Conversation>> | undefined,
  conversation: Conversation,
  scope: "active" | "archived",
  previous: Conversation,
): InfiniteData<Page<Conversation>> | undefined {
  if (!data?.pages.length) return data;
  const matches = belongsToScope(conversation, scope);
  // An absent item may simply be on an unloaded page, not outside this scope.
  const total = Math.max(
    0,
    data.pages[0].total +
      Number(matches) -
      Number(belongsToScope(previous, scope)),
  );
  const items = data.pages
    .flatMap((page) => page.items)
    .filter((item) => item.id !== conversation.id);
  if (matches) items.push(conversation);
  items.sort(compareConversations);

  return {
    ...data,
    pages: data.pages.map((page, index) => ({
      ...page,
      items: items.slice(
        index * THREAD_PAGE_SIZE,
        (index + 1) * THREAD_PAGE_SIZE,
      ),
      total,
      hasMore: (index + 1) * THREAD_PAGE_SIZE < total,
    })),
  };
}

/** Add/remove a film in cached watchlist order without mutating the snapshot. */
export function updateWatchlist(
  items: WatchlistItem[] | undefined,
  film: Film,
  present: boolean,
  timestamp: string,
): WatchlistItem[] | undefined {
  if (!items) return items;
  if (present && items.some((item) => item.id === film.id)) return items;
  const remaining = items.filter((item) => item.id !== film.id);
  return present ? [{ ...film, addedAt: timestamp }, ...remaining] : remaining;
}
