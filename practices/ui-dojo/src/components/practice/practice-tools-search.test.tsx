// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PracticeTools } from "./practice-tools";

type ToolRenderer = {
  name: string;
  render: (input: {
    status: string;
    parameters: Record<string, unknown>;
    result: unknown;
  }) => ReactNode;
};
const { renderTools, mutateAsync } = vi.hoisted(() => ({
  renderTools: [] as ToolRenderer[],
  mutateAsync: vi.fn(),
}));
vi.mock("@copilotkit/react-core/v2", () => ({
  useAgentContext: vi.fn(),
  useDefaultRenderTool: vi.fn(),
  useFrontendTool: vi.fn(),
  useHumanInTheLoop: vi.fn(),
  useRenderTool: (tool: ToolRenderer) => {
    renderTools.push(tool);
  },
}));
vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));
vi.mock("@/lib/practice/use-watchlist-mutation", () => ({
  useWatchlistMutation: () => ({ mutateAsync }),
}));

afterEach(() => {
  cleanup();
  renderTools.length = 0;
  vi.clearAllMocks();
});

describe("agent conversation search cards", () => {
  it("restores cards and preserves the search query and all filters when showing more results", () => {
    const onSearch = vi.fn();
    const onSelectConversation = vi.fn();
    const thread = {
      id: "conversation-id",
      title: "Weekend animation",
      createdAt: "2026-10-11T00:00:00.000Z",
      updatedAt: "2026-10-11T00:00:00.000Z",
      archivedAt: null,
      pinnedAt: null,
    };
    render(
      <PracticeTools
        thread={thread}
        files={[]}
        expanded
        onExpand={vi.fn()}
        onSearch={onSearch}
        onSelectConversation={onSelectConversation}
        onShowFile={vi.fn()}
        onWatchlist={vi.fn()}
        onDelete={vi.fn()}
        onDeleteFile={vi.fn()}
        onUpdateConversation={async () => thread}
        showUndo={vi.fn()}
      />,
    );
    const tool = renderTools.find(
      (entry) => entry.name === "find_conversations",
    )!;
    render(
      <>
        {tool.render({
          status: "complete",
          parameters: {
            query: "forest spirit",
            scope: "archived",
            updatedFrom: "2026-10-01",
            updatedTo: "2026-10-11",
            hasAttachments: false,
          },
          result: JSON.stringify({
            items: [
              {
                ...thread,
                attachmentCount: 1,
                snippet: "Totoro waits.",
                snippetHighlights: [{ start: 0, end: 6 }],
              },
            ],
            total: 31,
            page: 0,
            hasMore: true,
            searchMode: "hybrid",
          }),
        })}
      </>,
    );
    expect(screen.getByText("Weekend animation")).toBeTruthy();
    expect(screen.getByText("Totoro", { selector: "mark" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(onSelectConversation).toHaveBeenCalledWith(thread.id);
    fireEvent.click(
      screen.getByRole("button", { name: "Open search for more results" }),
    );
    expect(onSearch).toHaveBeenCalledWith("forest spirit", true, {
      scope: "archived",
      updatedFrom: "2026-10-01",
      updatedTo: "2026-10-11",
      hasAttachments: false,
    });
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
