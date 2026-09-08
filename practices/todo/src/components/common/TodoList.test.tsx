import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import userEvent from "@testing-library/user-event";
import { CopilotKit } from "@copilotkit/react-core";
import { expect, it, vi } from "vitest";
import { TodoList } from "./TodoList";

it("hydrates the server-rendered list without attribute or markup mismatches", async () => {
  const app = <CopilotKit runtimeUrl="/api/copilotkit"><TodoList /></CopilotKit>;
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  const recoverableError = vi.fn();
  const container = document.createElement("div");
  let root: Root | undefined;
  try {
    container.innerHTML = renderToString(app);
    expect(container.querySelector("[bis_skin_checked]")).toBeNull();
    document.body.appendChild(container);
    await act(async () => {
      root = hydrateRoot(container, app, { onRecoverableError: recoverableError });
    });
    expect(error).not.toHaveBeenCalled();
    expect(recoverableError).not.toHaveBeenCalled();
    expect(container.querySelector("#tasks-title")).toHaveTextContent("Your tasks");
  } finally {
    await act(async () => { root?.unmount(); });
    container.remove();
    error.mockRestore();
  }
});

it("adds, completes and deletes a task with accessible controls", async () => {
  const user = userEvent.setup();
  render(<CopilotKit runtimeUrl="/api/copilotkit"><TodoList /></CopilotKit>);
  expect(screen.getByText("No tasks yet")).toBeInTheDocument();
  const input = screen.getByRole("textbox", { name: "New task" });
  expect(screen.getByRole("button", { name: "Add task" })).toBeDisabled();
  await user.type(input, "  Prepare demo  {Enter}");
  expect(screen.getByText("Prepare demo")).toBeInTheDocument();
  expect(input).toHaveValue("");
  await user.click(screen.getByRole("checkbox"));
  expect(screen.getByText("1 of 1 completed")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Delete Prepare demo" }));
  expect(screen.getByText("No tasks yet")).toBeInTheDocument();
  expect(input).toHaveFocus();
});
