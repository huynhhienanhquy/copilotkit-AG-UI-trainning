// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Message } from "@ag-ui/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Attachment, Conversation } from "@/lib/practice/contracts";
import { GhibliChat } from "./ghibli-chat";

const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  agent: {
    threadId: "",
    messages: [] as Message[],
    setMessages: vi.fn(),
    addMessage: vi.fn(),
  },
  runtime: { runAgent: vi.fn(), stopAgent: vi.fn() },
}));

vi.mock("@/lib/practice/api", () => ({ practiceApi: mocks.api }));
vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({ theme: "light" }),
}));
vi.mock("./attachment-citation", () => ({
  AttachmentCitationProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  AttachmentCitationMarkdown: () => null,
}));
vi.mock("./practice-tools", () => ({
  PracticeTools: ({
    onShowFile,
  }: {
    onShowFile: (
      id: string,
      target: { page: number; start: number; end: number },
    ) => void;
  }) => (
    <button
      onClick={() => onShowFile("file-1", { page: 2, start: 40, end: 70 })}
    >
      Open exact source
    </button>
  ),
}));
vi.mock("@copilotkit/react-core/v2", () => ({
  useAgent: () => ({ agent: mocks.agent }),
  useCopilotKit: () => ({ copilotkit: mocks.runtime }),
  CopilotChatConfigurationProvider: ({
    children,
  }: {
    children: React.ReactNode;
  }) => children,
  CopilotChatMessageView: ({
    messages,
    assistantMessage: Assistant,
    userMessage: User,
  }: {
    messages: Message[];
    assistantMessage: React.ComponentType<{ message: Message }>;
    userMessage: React.ComponentType<{ message: Message }>;
  }) =>
    messages.map((message) =>
      message.role === "assistant" ? (
        <Assistant key={message.id} message={message} />
      ) : message.role === "user" ? (
        <User key={message.id} message={message} />
      ) : (
        <div key={message.id}>{String(message.content)}</div>
      ),
    ),
  CopilotChatAssistantMessage: ({
    message,
    onRegenerate,
    regenerateButton,
  }: {
    message: Message;
    onRegenerate: (message: Message) => void;
    regenerateButton: { disabled: boolean };
  }) => (
    <div>
      <p>{message.content as string}</p>
      <button
        disabled={regenerateButton.disabled}
        onClick={() => onRegenerate(message)}
      >
        Regenerate response
      </button>
    </div>
  ),
  CopilotChatUserMessage: ({
    message,
    onEditMessage,
    editButton,
  }: {
    message: Message;
    onEditMessage: (args: { message: Message }) => void;
    editButton: { disabled: boolean };
  }) => (
    <div>
      <p>{message.content as string}</p>
      <button
        disabled={editButton.disabled}
        onClick={() => onEditMessage({ message })}
      >
        Edit user message
      </button>
    </div>
  ),
}));

const thread: Conversation = {
  id: "thread-1",
  title: "Ghibli notes",
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  archivedAt: null,
  pinnedAt: null,
};
const file: Attachment = {
  id: "file-1",
  threadId: thread.id,
  messageId: null,
  filename: "notes.txt",
  mediaType: "text/plain",
  size: 100,
  createdAt: thread.createdAt,
};
const user: Message = { id: "user-1", role: "user", content: "Old question" };
const assistant: Message = {
  id: "assistant-1",
  role: "assistant",
  content: "Old answer",
};
let initialMessages: Message[];

beforeEach(() => {
  vi.clearAllMocks();
  initialMessages = [];
  mocks.agent.messages = [];
  mocks.agent.setMessages.mockImplementation((messages: Message[]) => {
    mocks.agent.messages = messages;
  });
  mocks.agent.addMessage.mockImplementation((message: Message) => {
    mocks.agent.messages = [...mocks.agent.messages, message];
  });
  mocks.runtime.runAgent.mockResolvedValue(undefined);
  mocks.runtime.stopAgent.mockResolvedValue(undefined);
  mocks.api.mockImplementation(async (path: string, options?: RequestInit) => {
    if (path.endsWith("messages?page=0"))
      return {
        items: initialMessages,
        hasMore: false,
        total: initialMessages.length,
        page: 0,
      };
    if (path.endsWith("/attachments")) return [file];
    if (path === "/watchlist") return [];
    if (options?.method === "PATCH") return { items: [user] };
    if (options?.method === "POST")
      return { id: "sent-user", role: "user", content: "New question" };
    throw new Error(`Unexpected API request: ${path}`);
  });
});
afterEach(cleanup);

function mount() {
  const onShowFile = vi.fn();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <GhibliChat
        thread={thread}
        expanded
        onExpand={vi.fn()}
        onSearch={vi.fn()}
        onShowFile={onShowFile}
        onSelectConversation={vi.fn()}
        onWatchlist={vi.fn()}
        onDelete={vi.fn()}
        onBusy={vi.fn()}
        onUpdateConversation={vi.fn()}
        showUndo={vi.fn()}
      />
    </QueryClientProvider>,
  );
  return { client, onShowFile };
}

describe("Ghibli chat integration", () => {
  it("forwards the citation target from tool cards to the correct attachment", async () => {
    const { onShowFile } = mount();
    await screen.findByText("Open exact source");
    await waitFor(() =>
      expect(mocks.api).toHaveBeenCalledWith(
        `/threads/${thread.id}/attachments`,
        expect.anything(),
      ),
    );
    fireEvent.click(screen.getByText("Open exact source"));
    expect(onShowFile).toHaveBeenCalledWith(file, {
      page: 2,
      start: 40,
      end: 70,
    });
  });

  it("edits and resends through the durable revision API", async () => {
    initialMessages = [user, assistant];
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "Edit user message" }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Edit message" }), {
      target: { value: "Revised question" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save and resend" }));
    await waitFor(() => expect(mocks.runtime.runAgent).toHaveBeenCalledOnce());
    expect(mocks.api).toHaveBeenCalledWith(
      `/threads/${thread.id}/messages/user-1`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ action: "edit", text: "Revised question" }),
      }),
    );
  });

  it("regenerates through the durable revision API", async () => {
    initialMessages = [user, assistant];
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "Regenerate response" }),
    );
    await waitFor(() => expect(mocks.runtime.runAgent).toHaveBeenCalledOnce());
    expect(mocks.api).toHaveBeenCalledWith(
      `/threads/${thread.id}/messages/assistant-1`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ action: "regenerate" }),
      }),
    );
  });

  it("stops while the message POST is pending and never starts a response afterwards", async () => {
    let finishPost!: (message: Message) => void;
    const defaultApi = mocks.api.getMockImplementation()!;
    mocks.api.mockImplementation((path: string, options?: RequestInit) =>
      options?.method === "POST"
        ? new Promise<Message>((resolve) => {
            finishPost = resolve;
          })
        : defaultApi(path, options),
    );
    mount();
    fireEvent.change(
      await screen.findByRole("textbox", { name: "Message Ghibli agent" }),
      { target: { value: "New question" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Stop response" }),
    );
    finishPost({ id: "late-user", role: "user", content: "New question" });
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Stop response" }),
      ).toBeNull(),
    );
    expect(mocks.runtime.runAgent).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "Response interrupted. You can regenerate it when ready.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("hides live reasoning and displays persisted interruption", async () => {
    initialMessages = [
      user,
      { id: "private", role: "reasoning", content: "Private model analysis" },
      { ...assistant, name: "interrupted" },
    ];
    mount();
    await screen.findByText("Interrupted");
    expect(screen.queryByText("Private model analysis")).toBeNull();
  });
});
