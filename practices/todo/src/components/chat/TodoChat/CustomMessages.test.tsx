import { render, screen } from "@testing-library/react";
import { ActionExecutionMessage, ActionExecutionScope, MessageStatusCode, ResultMessage, Role, TextMessage } from "@copilotkit/runtime-client-gql";
import { expect, it, vi } from "vitest";
import { CustomMessages } from "./CustomMessages";

vi.mock("@copilotkit/react-ui", () => ({ useChatContext: () => ({ labels: { initial: "Welcome" } }) }));
vi.mock("@copilotkit/react-core", () => ({
  useCopilotContext: () => ({ chatComponentsCache: { current: {
    updateTodo: ({ status, result }: { status: string; result?: { message: string } }) =>
      status === "complete" ? result?.message : "Updating task…",
  } } }),
}));

it("hides system prompts and renders user text literally and assistant Markdown safely", () => {
  const { container } = render(<CustomMessages inProgress={false} messages={[
    new TextMessage({ role: Role.System, content: "Internal instructions" }),
    new TextMessage({ role: Role.User, content: "<script>alert(1)</script>\nNext line" }),
    new TextMessage({ role: Role.Assistant, content: "**Done**\n\n<script>alert(2)</script>" }),
  ]} />);
  expect(screen.queryByText("Internal instructions")).not.toBeInTheDocument();
  expect(screen.getByText(/<script>alert/)).toBeInTheDocument();
  expect(screen.getByText("Done").tagName).toBe("STRONG");
  expect(container.querySelector("script")).toBeNull();
});

it("shows typing only while processing and preserves response controls", () => {
  const { rerender } = render(<CustomMessages messages={[]} inProgress><button>Stop</button></CustomMessages>);
  expect(screen.getByRole("status")).toHaveTextContent("Copilot is working");
  expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  rerender(<CustomMessages messages={[]} inProgress={false} />);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("renders actual action results and errors, not premature success", () => {
  const action = new ActionExecutionMessage({
    id: "call", name: "updateTodo", arguments: { id: "a" }, scope: ActionExecutionScope.Client,
    status: { code: MessageStatusCode.Success },
  });
  const { rerender } = render(<CustomMessages messages={[action]} inProgress />);
  expect(screen.getByText("Updating task…")).toBeInTheDocument();
  const result = new ResultMessage({
    actionExecutionId: "call", actionName: "updateTodo",
    result: ResultMessage.encodeResult({ ok: false, code: "NOT_FOUND", message: "Task no longer exists." }),
  });
  rerender(<CustomMessages messages={[action, result]} inProgress={false} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Task no longer exists.");
  expect(screen.queryByText("Updating task…")).not.toBeInTheDocument();
});
