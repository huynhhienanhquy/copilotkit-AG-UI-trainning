// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { practiceApi } from "@/lib/practice/api";
import { ConversationSearch } from "./conversation-search";
import { ConversationSearchCard } from "./conversation-search-card";

vi.mock("@/lib/practice/api", () => ({ practiceApi: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("conversation search UI", () => {
  it("preserves agent filters in the dialog and API request", async () => {
    vi.mocked(practiceApi).mockResolvedValue({
      items: [],
      page: 0,
      total: 0,
      hasMore: false,
      searchMode: "hybrid",
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <ConversationSearch
          query="forest spirit"
          includeArchived
          filters={{
            scope: "archived",
            updatedFrom: "2026-10-01",
            updatedTo: "2026-10-11",
            hasAttachments: false,
          }}
          onClose={vi.fn()}
          onSelect={vi.fn()}
        />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(practiceApi).toHaveBeenCalled());
    const url = new URL(
      vi.mocked(practiceApi).mock.calls[0][0],
      "http://localhost",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      query: "forest spirit",
      scope: "archived",
      page: "0",
      updatedFrom: "2026-10-01",
      updatedTo: "2026-10-11",
      hasAttachments: "false",
    });
    expect(
      (screen.getByLabelText("Conversation search scope") as HTMLSelectElement)
        .value,
    ).toBe("archived");
    expect(
      (screen.getByLabelText("Attachment filter") as HTMLSelectElement).value,
    ).toBe("without");
    client.clear();
  });

  it("renders interactive, safely highlighted cards", () => {
    const onOpen = vi.fn();
    const snippet = "Totoro <img src=x onerror=alert(1)>";
    const { container } = render(
      <ConversationSearchCard
        result={{
          id: "conversation-id",
          title: "Weekend animation",
          createdAt: "2026-10-11T00:00:00.000Z",
          updatedAt: "2026-10-11T00:00:00.000Z",
          archivedAt: null,
          pinnedAt: null,
          attachmentCount: 2,
          matchSource: "message",
          snippet,
          snippetHighlights: [{ start: 0, end: 6 }],
        }}
        onOpen={onOpen}
      />,
    );
    expect(container.querySelector("mark")?.textContent).toBe("Totoro");
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain(snippet);
    expect(screen.getByText("2 files")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(onOpen).toHaveBeenCalledWith("conversation-id");
  });
});
