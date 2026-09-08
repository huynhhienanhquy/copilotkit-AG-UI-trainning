import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextMessage, Role } from "@copilotkit/runtime-client-gql";
import { expect, it, vi } from "vitest";
import { CustomInput } from "./CustomInput";

const message = new TextMessage({ role: Role.User, content: "hello" });

it("sends trimmed text, supports newlines and ignores IME Enter", async () => {
  const user = userEvent.setup();
  const send = vi.fn().mockResolvedValue(message);
  render(<CustomInput inProgress={false} onSend={send} />);
  const input = screen.getByRole("textbox", { name: "Message Copilot" });
  expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  await user.type(input, "   ");
  expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  await user.clear(input);
  await user.type(input, "hello");
  fireEvent.compositionStart(input);
  fireEvent.keyDown(input, { key: "Enter", isComposing: true });
  expect(send).not.toHaveBeenCalled();
  fireEvent.compositionEnd(input);
  await user.keyboard("{Shift>}{Enter}{/Shift}world");
  expect(input).toHaveValue("hello\nworld");
  await user.keyboard("{Enter}");
  expect(send).toHaveBeenCalledWith("hello\nworld");
  await waitFor(() => expect(input).toHaveValue(""));
});

it("prevents duplicate submission while a send is pending", async () => {
  let resolve!: (value: TextMessage) => void;
  const send = vi.fn(() => new Promise<TextMessage>((done) => { resolve = done; }));
  render(<CustomInput inProgress={false} onSend={send} />);
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: "Task" } });
  fireEvent.keyDown(input, { key: "Enter" });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(send).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Working…" })).toBeDisabled();
  await act(async () => { resolve(message); });
});

it("restores the draft after a rejected request and can retry", async () => {
  const user = userEvent.setup();
  const send = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(message);
  render(<CustomInput inProgress={false} onSend={send} />);
  await user.type(screen.getByRole("textbox"), "Keep my draft{Enter}");
  expect(await screen.findByRole("alert")).toHaveTextContent("Your draft is saved");
  expect(screen.getByRole("textbox")).toHaveValue("Keep my draft");
  await user.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  expect(send).toHaveBeenCalledTimes(2);
});

it("blocks sends while Copilot is processing", () => {
  const send = vi.fn();
  render(<CustomInput inProgress onSend={send} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Task" } });
  fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
  expect(send).not.toHaveBeenCalled();
});
