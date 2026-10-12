// @vitest-environment jsdom

import { useEffect, type ComponentProps, type ReactNode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CopilotKitProvider, useCopilotKit } from "@copilotkit/react-core/v2";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { practiceApi } from "@/lib/practice/api";
import type { Attachment, Film } from "@/lib/practice/contracts";
import { PracticeTools } from "./practice-tools";
import { WatchlistToolApproval } from "./watchlist-tool-approval";

vi.mock("@/lib/practice/api", () => ({ practiceApi: vi.fn() }));
const api = vi.mocked(practiceApi);
const film: Film = {
  id: "2baf70d1-42bb-4437-b551-e5fed5a87abe",
  title: "Castle in the Sky",
  description: "A floating castle",
  image: "https://example.com/castle.jpg",
  releaseYear: "1986",
};
const file: Attachment = {
  id: "64dc80b8-b373-4c33-858e-3f8a031b28a4",
  threadId: "f046f566-373f-4c21-b854-bc452a9687c6",
  messageId: null,
  filename: "uploaded.txt",
  mediaType: "text/plain",
  size: 100,
  createdAt: "2026-10-12T00:00:00.000Z",
};
let core: ReturnType<typeof useCopilotKit>["copilotkit"];
const clients: QueryClient[] = [];

function CaptureCore() {
  const { copilotkit } = useCopilotKit();
  useEffect(() => {
    core = copilotkit;
  }, [copilotkit]);
  return null;
}

function harness() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(client);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <CopilotKitProvider>
        <CaptureCore />
        {children}
      </CopilotKitProvider>
    </QueryClientProvider>
  );
  const props: ComponentProps<typeof PracticeTools> = {
    thread: {
      id: file.threadId,
      title: "New conversation",
      createdAt: file.createdAt,
      updatedAt: file.createdAt,
      archivedAt: null,
      pinnedAt: null,
    },
    files: [],
    expanded: true,
    onExpand: vi.fn(),
    onSearch: vi.fn(),
    onSelectConversation: vi.fn(),
    onShowFile: vi.fn(),
    onWatchlist: vi.fn(),
    onDelete: vi.fn(),
    onDeleteFile: vi.fn(),
    onUpdateConversation: vi.fn(),
    showUndo: vi.fn(),
  };
  return { client, wrapper, props };
}

function invoke(name: string, args: Record<string, unknown>) {
  const tool = core.getTool({ toolName: name });
  if (!tool?.handler) throw new Error(`Tool ${name} is not registered`);
  return (tool.handler as (args: Record<string, unknown>) => Promise<unknown>)(
    args,
  );
}

function toolView(name: string) {
  const renderer = core.renderToolCalls.find((entry) => entry.name === name);
  if (!renderer) throw new Error(`Renderer ${name} is not registered`);
  const Render = renderer.render as (props: {
    args: Record<string, unknown>;
    status: "executing" | "complete";
    result?: string;
  }) => ReactNode;
  return Render;
}

beforeEach(() => {
  // These tests exercise local SDK registrations without a runtime/provider request.
  const warn = console.warn;
  vi.spyOn(console, "warn").mockImplementation((message, ...args) => {
    if (
      message !==
      "Missing required prop: 'runtimeUrl' or 'publicApiKey' or 'publicLicenseKey'"
    ) {
      warn(message, ...args);
    }
  });
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  vi.restoreAllMocks();
  api.mockReset();
});

describe("attachment tools with real CopilotKit registrations", () => {
  it("opens new uploads with the current callback, rejects saved deletes and forgets deleted files", async () => {
    const { wrapper, props } = harness();
    const view = render(<PracticeTools {...props} />, { wrapper });
    expect(
      await invoke("show_attachment", { attachmentId: file.id }),
    ).toMatchObject({ error: expect.any(String) });
    const onShowFile = vi.fn();
    view.rerender(
      <PracticeTools {...props} files={[file]} onShowFile={onShowFile} />,
    );
    expect(
      await invoke("show_attachment", {
        attachmentId: file.id,
        page: 1,
        start: 10,
        end: 20,
      }),
    ).toMatchObject({ opened: true });
    expect(onShowFile).toHaveBeenCalledWith(file.id, {
      page: 1,
      start: 10,
      end: 20,
    });
    expect(props.onShowFile).not.toHaveBeenCalled();
    expect(
      await invoke("delete_attachment", { attachmentId: file.id }),
    ).toMatchObject({ status: "awaiting_user_confirmation" });
    expect(props.onDeleteFile).toHaveBeenCalledWith(file);

    view.rerender(
      <PracticeTools
        {...props}
        files={[{ ...file, messageId: "saved-message" }]}
      />,
    );
    expect(
      await invoke("delete_attachment", { attachmentId: file.id }),
    ).toMatchObject({ error: expect.stringContaining("Saved attachments") });
    expect(props.onDeleteFile).toHaveBeenCalledTimes(1);
    view.rerender(<PracticeTools {...props} files={[]} />);
    expect(
      await invoke("show_attachment", { attachmentId: file.id }),
    ).toMatchObject({ error: expect.any(String) });
  });

  it("refreshes extraction source buttons after attachment hydration", () => {
    const { wrapper, props } = harness();
    const view = render(<PracticeTools {...props} />, { wrapper });
    view.rerender(<PracticeTools {...props} files={[file]} />);
    const Source = toolView("extract_attachment");
    render(
      <Source
        status="complete"
        args={{ attachmentId: file.id }}
        result={JSON.stringify({
          attachmentId: file.id,
          filename: file.filename,
          offset: 0,
          text: "source text",
          chunks: [
            {
              attachmentId: file.id,
              filename: file.filename,
              page: 1,
              start: 0,
              end: 11,
            },
          ],
        })}
      />,
      { wrapper },
    );
    fireEvent.click(
      screen.getByRole("button", { name: /uploaded.txt · p. 1/ }),
    );
    expect(props.onShowFile).toHaveBeenCalledWith(file.id, {
      page: 1,
      start: 0,
      end: 11,
    });
  });
});

describe("canonical watchlist approval", () => {
  it.each(["add", "remove"] as const)(
    "approves %s using the canonical film rather than a mismatched model title",
    async (action) => {
      const { client, wrapper, props } = harness();
      let removed = false;
      client.setQueryData(
        ["practice", "watchlist"],
        action === "add" ? [] : [{ ...film, addedAt: file.createdAt }],
      );
      api.mockImplementation(async (path, options) => {
        if (path === "/films") return [film];
        if (path === "/watchlist")
          return removed ? [] : [{ ...film, addedAt: file.createdAt }];
        if (path === `/watchlist/${film.id}`) {
          removed = options?.method === "DELETE";
          return removed
            ? { status: "removed", filmId: film.id }
            : { status: "added", film };
        }
        throw new Error(`Unexpected API request ${path}`);
      });
      render(<PracticeTools {...props} />, { wrapper });
      const name = `${action}_watchlist_film`;
      const args = { filmId: film.id, filmTitle: "My Neighbor Totoro" };
      const completion = invoke(name, args);
      const Approval = toolView(name);
      const view = render(<Approval status="executing" args={args} />, {
        wrapper,
      });
      await screen.findByText(
        `${action === "add" ? "Add" : "Remove"} Castle in the Sky ${action === "add" ? "to" : "from"} your watchlist.`,
      );
      const approve = screen.getByRole("button", { name: `Approve ${action}` });
      await waitFor(() =>
        expect((approve as HTMLButtonElement).disabled).toBe(false),
      );
      expect(screen.queryByText(/My Neighbor Totoro/)).toBeNull();
      expect(api.mock.calls.some(([, options]) => options?.method)).toBe(false);
      fireEvent.click(approve);
      let outcome: unknown;
      await act(async () => {
        outcome = await completion;
      });
      expect(api).toHaveBeenCalledWith(`/watchlist/${film.id}`, {
        method: action === "add" ? "PUT" : "DELETE",
      });
      expect(outcome).toMatchObject({
        approved: true,
        film: { id: film.id, title: film.title },
      });
      view.rerender(
        <Approval
          status="complete"
          args={args}
          result={JSON.stringify(outcome)}
        />,
      );
      expect(screen.getByText("Approved and completed")).toBeTruthy();
      expect(screen.getByText(new RegExp(`Castle in the Sky`))).toBeTruthy();
    },
  );

  it("blocks unknown films but still permits decline without a mutation", async () => {
    const { wrapper, props } = harness();
    api.mockResolvedValue([]);
    render(<PracticeTools {...props} />, { wrapper });
    const args = { filmId: film.id, filmTitle: "Invented title" };
    const completion = invoke("add_watchlist_film", args);
    const Approval = toolView("add_watchlist_film");
    render(<Approval status="executing" args={args} />, { wrapper });
    await screen.findByText("Film not found in the Ghibli catalog.");
    const approve = screen.getByRole("button", { name: "Approve add" });
    expect((approve as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(approve);
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    await expect(completion).resolves.toMatchObject({ approved: false });
    expect(api.mock.calls.every(([path]) => path === "/films")).toBe(true);
  });

  it("keeps approval blocked on lookup failure and enables it after a successful retry", async () => {
    const { wrapper } = harness();
    const approve = vi.fn(async () => undefined);
    api
      .mockRejectedValueOnce(new Error("Catalog unavailable"))
      .mockResolvedValueOnce([film]);
    render(
      <WatchlistToolApproval
        action="add"
        filmId={film.id}
        status="executing"
        onApprove={approve}
      />,
      { wrapper },
    );
    await screen.findByText("Catalog unavailable");
    expect(
      (screen.getByRole("button", { name: "Approve add" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Retry film lookup" }));
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "Approve add",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Approve add" }));
    await waitFor(() => expect(approve).toHaveBeenCalledWith(film));
  });

  it("restores recorded canonical labels without fetching or replaying an approval", () => {
    const { wrapper } = harness();
    render(
      <WatchlistToolApproval
        action="remove"
        filmId={film.id}
        status="complete"
        result={JSON.stringify({ approved: true, film })}
      />,
      { wrapper },
    );
    expect(
      screen.getByText("Remove Castle in the Sky from your watchlist."),
    ).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(api).not.toHaveBeenCalled();
  });
});
