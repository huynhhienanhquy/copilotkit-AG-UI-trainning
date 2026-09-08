import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi, beforeEach } from "vitest";
import { Role, TextMessage, type Message } from "@copilotkit/runtime-client-gql";
import { TodoCopilot } from "./TodoCopilot";

const api = vi.hoisted(() => ({
  appendMessage: vi.fn(), reloadMessages: vi.fn(), stopGeneration: vi.fn(),
  visibleMessages: [] as Message[],
}));
vi.mock("@copilotkit/react-core", () => ({
  useCopilotChat: () => ({ ...api, isLoading: false }),
  useCopilotContext: () => ({ chatComponentsCache: { current: {} } }),
}));
vi.mock("@copilotkit/react-ui", () => ({
  useChatContext: () => ({ labels: { initial: "Welcome" } }),
  CopilotPopup: ({ Input, Messages, ResponseButton }: {
    Input: React.ComponentType<import("@copilotkit/react-ui").InputProps>;
    Messages: React.ComponentType<import("@copilotkit/react-ui").MessagesProps>;
    ResponseButton: React.ComponentType;
  }) => <><Messages messages={[]} inProgress={false}><ResponseButton /></Messages>
    <Input inProgress={false} isVisible onSend={vi.fn()} /></>,
}));
beforeEach(() => { vi.resetAllMocks(); api.visibleMessages = []; });

it("detects the beta transport returning an empty stream without rejection", async () => {
  api.appendMessage.mockResolvedValue(undefined);
  render(<TodoCopilot />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Keep this draft" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue("Keep this draft"));
  expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
});

it("accepts a completed new assistant response", async () => {
  api.appendMessage.mockImplementation(async () => {
    api.visibleMessages = [new TextMessage({ role: Role.Assistant, content: "Done." })];
  });
  render(<TodoCopilot />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Add a task" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() => expect(screen.queryByText("Copilot is working…")).not.toBeInTheDocument());
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("awaits the real request, exposes failure and preserves the draft", async () => {
  api.appendMessage.mockRejectedValue(new Error("offline"));
  render(<TodoCopilot />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Please add a task" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue("Please add a task"));
  expect(screen.getAllByRole("alert").some((element) => element.textContent?.includes("Could not reach Copilot"))).toBe(true);
  expect(screen.queryByText("Copilot is working…")).not.toBeInTheDocument();
  expect(api.appendMessage).toHaveBeenCalledTimes(1);
});

it("stops the same request without reporting cancellation as an error", async () => {
  let reject!: (reason: Error) => void;
  api.appendMessage.mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
  api.stopGeneration.mockImplementation(() => reject(new DOMException("Stopped", "AbortError")));
  const { unmount } = render(<TodoCopilot />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Add a task" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  expect(screen.getByText("Copilot is working…")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Stop response" }));
  await waitFor(() => expect(screen.queryByText("Copilot is working…")).not.toBeInTheDocument());
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(api.stopGeneration).toHaveBeenCalledTimes(1);
  unmount();
});

it("handles retry rejection without an unhandled promise", async () => {
  api.reloadMessages.mockRejectedValue(new Error("offline"));
  render(<TodoCopilot />);
  fireEvent.click(screen.getByRole("button", { name: "Retry response" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Could not reach Copilot"));
  expect(api.reloadMessages).toHaveBeenCalledTimes(1);
});

it("aborts requests that reach the response deadline", async () => {
  vi.useFakeTimers();
  let reject!: (reason: Error) => void;
  api.appendMessage.mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
  api.stopGeneration.mockImplementation(() => reject(new DOMException("Timeout", "AbortError")));
  const { unmount } = render(<TodoCopilot />);
  try {
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Add a task" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(screen.getAllByRole("alert").some((element) => element.textContent?.includes("timed out"))).toBe(true);
    expect(screen.queryByText("Copilot is working…")).not.toBeInTheDocument();
  } finally {
    unmount();
    vi.useRealTimers();
  }
});
