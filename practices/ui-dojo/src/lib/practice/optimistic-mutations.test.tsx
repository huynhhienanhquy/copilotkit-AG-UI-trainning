// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { practiceApi } from "./api";
import type { Conversation, Film, WatchlistItem } from "./contracts";
import type { UndoToastRequest } from "@/components/practice/undo-toast";
import { useConversationMutation } from "./use-conversation-mutation";
import { useWatchlistMutation } from "./use-watchlist-mutation";

vi.mock("./api", () => ({ practiceApi: vi.fn() }));
const api = vi.mocked(practiceApi);
const thread: Conversation = {
  id: "thread-1",
  title: "Totoro plans",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  archivedAt: null,
  pinnedAt: null,
};
const film: Film = {
  id: "film-1",
  title: "Totoro",
  description: "Forest spirit",
  image: "https://example.com/totoro.jpg",
  releaseYear: "1988",
};
const watched: WatchlistItem = { ...film, addedAt: thread.createdAt };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function harness() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

function seedConversation(client: QueryClient) {
  const active = {
    pageParams: [0],
    pages: [{ items: [thread], page: 0, total: 1, hasMore: false }],
  };
  const archived = {
    pageParams: [0],
    pages: [{ items: [], page: 0, total: 0, hasMore: false }],
  };
  client.setQueryData(["practice", "threads", "active"], active);
  client.setQueryData(["practice", "threads", "archived"], archived);
  client.setQueryData(["practice", "thread", thread.id], thread);
  return { active, archived };
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("conversation mutation lifecycle", () => {
  it("counts archive and Undo once when search targets a conversation on an unloaded page", async () => {
    const { client, wrapper } = harness();
    const loaded = Array.from({ length: 30 }, (_, index) => ({
      ...thread,
      id: `loaded-${index}`,
    }));
    client.setQueryData(["practice", "threads", "active"], {
      pageParams: [0],
      pages: [{ items: loaded, page: 0, total: 31, hasMore: true }],
    });
    client.setQueryData(["practice", "threads", "archived"], {
      pageParams: [0],
      pages: [{ items: [], page: 0, total: 0, hasMore: false }],
    });
    const request = deferred<Conversation>();
    const archived = { ...thread, archivedAt: thread.createdAt };
    api
      .mockResolvedValueOnce(thread)
      .mockImplementationOnce(() => request.promise)
      .mockResolvedValueOnce(thread);
    const showUndo = vi.fn<(request: UndoToastRequest) => void>();
    const { result } = renderHook(
      () => useConversationMutation({ showUndo, onError: vi.fn() }),
      { wrapper },
    );
    let completion!: Promise<Conversation>;
    act(() => {
      completion = result.current.mutateAsync({
        id: thread.id,
        patch: { archived: true },
      });
    });
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
    expect(
      client.getQueryData(["practice", "threads", "active"]),
    ).toMatchObject({
      pages: [{ total: 30, hasMore: false }],
    });
    await act(async () => {
      request.resolve(archived);
      await completion;
    });
    expect(
      client.getQueryData(["practice", "threads", "active"]),
    ).toMatchObject({ pages: [{ total: 30 }] });
    expect(
      client.getQueryData(["practice", "threads", "archived"]),
    ).toMatchObject({ pages: [{ total: 1 }] });
    await act(async () => {
      await showUndo.mock.calls[0][0].onUndo();
    });
    expect(
      client.getQueryData(["practice", "threads", "active"]),
    ).toMatchObject({ pages: [{ total: 31, hasMore: true }] });
    expect(
      client.getQueryData(["practice", "threads", "archived"]),
    ).toMatchObject({ pages: [{ total: 0 }] });
  });

  it("updates scoped list/detail caches before the request resolves and rolls them back on failure", async () => {
    const { client, wrapper } = harness();
    const original = seedConversation(client);
    const request = deferred<Conversation>();
    api.mockImplementation(() => request.promise);
    const onError = vi.fn();
    const showUndo = vi.fn();
    const { result } = renderHook(
      () => useConversationMutation({ showUndo, onError }),
      { wrapper },
    );
    let completion!: Promise<unknown>;
    act(() => {
      completion = result.current
        .mutateAsync({
          id: thread.id,
          patch: { archived: true },
        })
        .catch((failure) => failure);
    });
    await waitFor(() => expect(api).toHaveBeenCalledOnce());
    expect(
      client.getQueryData(["practice", "threads", "active"]),
    ).toMatchObject({
      pages: [{ items: [], total: 0 }],
    });
    expect(
      client.getQueryData(["practice", "threads", "archived"]),
    ).toMatchObject({
      pages: [
        {
          items: [{ id: thread.id, archivedAt: expect.any(String) }],
          total: 1,
        },
      ],
    });
    expect(
      client.getQueryData<Conversation>(["practice", "thread", thread.id])
        ?.archivedAt,
    ).toBeTruthy();
    await act(async () => {
      request.reject(new Error("Archive failed"));
      await completion;
    });
    expect(client.getQueryData(["practice", "threads", "active"])).toEqual(
      original.active,
    );
    expect(client.getQueryData(["practice", "threads", "archived"])).toEqual(
      original.archived,
    );
    expect(client.getQueryData(["practice", "thread", thread.id])).toEqual(
      thread,
    );
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Archive failed" }),
    );
    expect(showUndo).not.toHaveBeenCalled();
  });

  it("restores all prior values when Undo follows a compound agent mutation", async () => {
    const { client, wrapper } = harness();
    seedConversation(client);
    const changed = {
      ...thread,
      title: "New title",
      archivedAt: "2026-10-11T00:00:00.000Z",
      pinnedAt: "2026-10-11T00:00:00.000Z",
    };
    api.mockResolvedValueOnce(changed).mockResolvedValueOnce(thread);
    const showUndo = vi.fn<(request: UndoToastRequest) => void>();
    const { result } = renderHook(
      () => useConversationMutation({ showUndo, onError: vi.fn() }),
      { wrapper },
    );
    await act(async () => {
      await result.current.mutateAsync({
        id: thread.id,
        patch: { title: "New title", archived: true, pinned: true },
      });
    });
    expect(showUndo).toHaveBeenCalledOnce();
    await act(async () => {
      await showUndo.mock.calls[0][0].onUndo();
    });
    expect(JSON.parse(String(api.mock.calls[1][1]?.body))).toEqual({
      title: thread.title,
      archived: false,
      pinned: false,
    });
    expect(client.getQueryData(["practice", "thread", thread.id])).toEqual(
      thread,
    );
    expect(showUndo).toHaveBeenCalledOnce();
  });

  it("does not offer an inverse action when archiving an already archived conversation", async () => {
    const { client, wrapper } = harness();
    const alreadyArchived = { ...thread, archivedAt: thread.createdAt };
    client.setQueryData(["practice", "thread", thread.id], alreadyArchived);
    api.mockResolvedValue(alreadyArchived);
    const showUndo = vi.fn();
    const { result } = renderHook(
      () => useConversationMutation({ showUndo, onError: vi.fn() }),
      { wrapper },
    );
    await act(async () => {
      await result.current.mutateAsync({
        id: thread.id,
        patch: { archived: true },
      });
    });
    expect(showUndo).not.toHaveBeenCalled();
  });

  it("offers the required archive toast and restores a conversation found outside cached pages", async () => {
    const { wrapper } = harness();
    api
      .mockResolvedValueOnce(thread)
      .mockResolvedValueOnce({ ...thread, archivedAt: thread.createdAt })
      .mockResolvedValueOnce({ ...thread, archivedAt: thread.createdAt })
      .mockResolvedValueOnce(thread);
    const showUndo = vi.fn<(request: UndoToastRequest) => void>();
    const { result } = renderHook(
      () => useConversationMutation({ showUndo, onError: vi.fn() }),
      { wrapper },
    );
    await act(async () => {
      await result.current.mutateAsync({
        id: thread.id,
        patch: { archived: true },
      });
    });
    expect(api.mock.calls[0]).toEqual([`/threads/${thread.id}`]);
    expect(showUndo.mock.calls[0][0].message).toBe("Conversation archived");
    await act(async () => {
      await showUndo.mock.calls[0][0].onUndo();
    });
    expect(JSON.parse(String(api.mock.calls[3][1]?.body))).toEqual({
      archived: false,
    });
  });
});

describe("shared watchlist mutation lifecycle", () => {
  it("removes immediately, restores on rejected API requests, and offers no false Undo", async () => {
    const { client, wrapper } = harness();
    client.setQueryData(["practice", "watchlist"], [watched]);
    const request = deferred<unknown>();
    api.mockImplementation(() => request.promise);
    const showUndo = vi.fn();
    const { result } = renderHook(() => useWatchlistMutation(showUndo), {
      wrapper,
    });
    let completion!: Promise<unknown>;
    act(() => {
      completion = result.current
        .mutateAsync({ filmId: film.id, method: "DELETE" })
        .catch((failure) => failure);
    });
    await waitFor(() => expect(api).toHaveBeenCalledOnce());
    expect(client.getQueryData(["practice", "watchlist"])).toEqual([]);
    await act(async () => {
      request.reject(new Error("Removal failed"));
      await completion;
    });
    expect(client.getQueryData(["practice", "watchlist"])).toEqual([watched]);
    expect(showUndo).not.toHaveBeenCalled();
  });

  it("undoes removal through the same optimistic mutation path", async () => {
    const { client, wrapper } = harness();
    client.setQueryData(["practice", "watchlist"], [watched]);
    api
      .mockResolvedValueOnce({ status: "removed", filmId: film.id })
      .mockResolvedValueOnce({ status: "added", film });
    const showUndo = vi.fn<(request: UndoToastRequest) => void>();
    const { result } = renderHook(() => useWatchlistMutation(showUndo), {
      wrapper,
    });
    await act(async () => {
      await result.current.mutateAsync({ filmId: film.id, method: "DELETE" });
    });
    expect(showUndo.mock.calls[0][0].message).toBe(
      "Totoro removed from watchlist",
    );
    await act(async () => {
      await showUndo.mock.calls[0][0].onUndo();
    });
    expect(api.mock.calls[1]).toEqual([
      `/watchlist/${film.id}`,
      { method: "PUT" },
    ]);
    expect(client.getQueryData(["practice", "watchlist"])).toMatchObject([
      { id: film.id },
    ]);
    expect(showUndo).toHaveBeenCalledOnce();
  });

  it("adds an agent-selected catalog film optimistically and rolls back a failed write", async () => {
    const { client, wrapper } = harness();
    client.setQueryData(["practice", "watchlist"], []);
    const request = deferred<unknown>();
    api
      .mockResolvedValueOnce([film])
      .mockImplementationOnce(() => request.promise);
    const { result } = renderHook(() => useWatchlistMutation(vi.fn()), {
      wrapper,
    });
    let completion!: Promise<unknown>;
    act(() => {
      completion = result.current
        .mutateAsync({ filmId: film.id, method: "PUT" })
        .catch((failure) => failure);
    });
    await waitFor(() => expect(api).toHaveBeenCalledTimes(2));
    expect(api.mock.calls[0][0]).toBe("/films");
    expect(client.getQueryData(["practice", "watchlist"])).toMatchObject([
      { id: film.id },
    ]);
    await act(async () => {
      request.reject(new Error("Add failed"));
      await completion;
    });
    expect(client.getQueryData(["practice", "watchlist"])).toEqual([]);
  });

  it("does not lose other writes when agent and panel mutations overlap", async () => {
    const { client, wrapper } = harness();
    const other = { ...watched, id: "film-2", title: "Ponyo" };
    client.setQueryData(["practice", "watchlist"], [watched, other]);
    const first = deferred<unknown>();
    api
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValueOnce({ status: "removed", filmId: other.id });
    const { result } = renderHook(
      () => ({
        agent: useWatchlistMutation(vi.fn()),
        panel: useWatchlistMutation(vi.fn()),
      }),
      { wrapper },
    );
    let failure!: Promise<unknown>;
    let success!: Promise<unknown>;
    act(() => {
      failure = result.current.agent
        .mutateAsync({ filmId: film.id, method: "DELETE" })
        .catch((error) => error);
      success = result.current.panel.mutateAsync({
        filmId: other.id,
        method: "DELETE",
      });
    });
    await waitFor(() => expect(api).toHaveBeenCalledOnce());
    expect(client.getQueryData(["practice", "watchlist"])).toEqual([other]);
    await act(async () => {
      first.reject(new Error("First removal failed"));
      await Promise.all([failure, success]);
    });
    expect(client.getQueryData(["practice", "watchlist"])).toEqual([watched]);
  });
});
