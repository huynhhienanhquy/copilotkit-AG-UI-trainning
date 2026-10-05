import { expect, it } from "vitest";
import type { InfiniteData } from "@tanstack/react-query";
import type { Conversation, Film, Page } from "./contracts";
import {
  optimisticConversation,
  updateConversationPages,
  updateWatchlist,
} from "./optimistic-updates";

const now = "2026-10-05T10:00:00.000Z";
const thread: Conversation = {
  id: "thread-1",
  title: "Totoro plans",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  archivedAt: null,
  pinnedAt: null,
};

function pages(items: Conversation[]): InfiniteData<Page<Conversation>> {
  return {
    pageParams: [0],
    pages: [{ items, page: 0, total: items.length, hasMore: false }],
  };
}

it("moves an optimistically archived conversation between scoped caches", () => {
  const archived = optimisticConversation(thread, { archived: true }, now);
  expect(
    updateConversationPages(pages([thread]), archived, "active")?.pages[0],
  ).toMatchObject({ items: [], total: 0 });
  expect(
    updateConversationPages(pages([]), archived, "archived")?.pages[0],
  ).toMatchObject({ items: [archived], total: 1 });

  const restored = optimisticConversation(archived, { archived: false }, now);
  expect(
    updateConversationPages(pages([]), restored, "active")?.pages[0].items,
  ).toEqual([restored]);
});

it("sorts an optimistically pinned conversation first and supports its inverse", () => {
  const newer = {
    ...thread,
    id: "thread-2",
    updatedAt: "2026-10-04T00:00:00.000Z",
  };
  const pinned = optimisticConversation(thread, { pinned: true }, now);
  expect(
    updateConversationPages(pages([newer, thread]), pinned, "active")?.pages[0]
      .items[0],
  ).toEqual(pinned);
  expect(
    optimisticConversation(pinned, { pinned: false }, now).pinnedAt,
  ).toBeNull();
});

it("removes and restores a watchlist item without mutating the snapshot", () => {
  const film: Film = {
    id: "film-1",
    title: "Totoro",
    description: "Forest spirit",
    image: "https://example.com/totoro.jpg",
    releaseYear: "1988",
  };
  const original = [{ ...film, addedAt: "2026-10-01T00:00:00.000Z" }];
  expect(updateWatchlist(original, film, false, now)).toEqual([]);
  expect(updateWatchlist([], film, true, now)).toEqual([
    { ...film, addedAt: now },
  ]);
  expect(original).toHaveLength(1);
});
