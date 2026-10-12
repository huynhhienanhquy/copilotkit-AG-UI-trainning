// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UndoToastViewport, useUndoToast } from "./undo-toast";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function pendingUndo() {
  let complete!: () => void;
  const promise = new Promise<void>((resolve) => {
    complete = resolve;
  });
  return { promise, complete };
}

describe("Undo notification lifecycle", () => {
  it("keeps an in-flight Undo visible and preserves a newer notification when it finishes", async () => {
    vi.useFakeTimers();
    const oldUndo = pendingUndo();
    function ToastHarness() {
      const notices = useUndoToast();
      return (
        <>
          <button
            onClick={() =>
              notices.showUndo({
                message: "Conversation archived",
                onUndo: () => oldUndo.promise,
              })
            }
          >
            Archive
          </button>
          <button
            onClick={() =>
              notices.showUndo({
                message: "Conversation pinned",
                onUndo: vi.fn(),
              })
            }
          >
            Pin
          </button>
          <UndoToastViewport
            key={notices.toast?.id ?? "empty"}
            toast={notices.toast}
            onDismiss={notices.dismiss}
          />
        </>
      );
    }
    render(<ToastHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(screen.getByRole("status").textContent).toContain(
      "Conversation archived —Undo",
    );
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByRole("button", { name: "Undoing…" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Pin" }));
    await act(async () => {
      oldUndo.complete();
      await oldUndo.promise;
    });
    expect(screen.getByRole("status").textContent).toContain(
      "Conversation pinned",
    );
    expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy();
  });

  it("shows a rejected Undo error and lets the user retry", async () => {
    const undo = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network offline"))
      .mockResolvedValueOnce(undefined);
    function ToastHarness() {
      const notices = useUndoToast();
      return (
        <>
          <button
            onClick={() =>
              notices.showUndo({
                message: "Conversation archived",
                onUndo: undo,
              })
            }
          >
            Archive
          </button>
          <UndoToastViewport
            key={notices.toast?.id ?? "empty"}
            toast={notices.toast}
            onDismiss={notices.dismiss}
          />
        </>
      );
    }
    render(<ToastHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    });
    expect(screen.getByText("Network offline")).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    });
    expect(undo).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
