// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WatchlistApprovalCard } from "./watchlist-approval-card";

const FILM_ID = "2baf70d1-42bb-4437-b551-e5fed5a87abe";

afterEach(cleanup);

describe("WatchlistApprovalCard", () => {
  it("does not execute the mutation before approval", async () => {
    const approve = vi.fn(async () => undefined);
    const decline = vi.fn(async () => undefined);
    render(
      <WatchlistApprovalCard
        action="add"
        filmId={FILM_ID}
        filmTitle="Castle in the Sky"
        status="executing"
        onApprove={approve}
        onDecline={decline}
      />,
    );

    expect(approve).not.toHaveBeenCalled();
    expect(decline).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Approve add" }));
    await waitFor(() => expect(approve).toHaveBeenCalledOnce());
  });

  it("declines without executing the approved mutation", async () => {
    const approve = vi.fn(async () => undefined);
    const decline = vi.fn(async () => undefined);
    render(
      <WatchlistApprovalCard
        action="remove"
        filmId={FILM_ID}
        filmTitle="Castle in the Sky"
        status="executing"
        onApprove={approve}
        onDecline={decline}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    await waitFor(() => expect(decline).toHaveBeenCalledOnce());
    expect(approve).not.toHaveBeenCalled();
  });

  it("renders the persisted approval outcome", () => {
    render(
      <WatchlistApprovalCard
        action="add"
        filmId={FILM_ID}
        filmTitle="Castle in the Sky"
        status="complete"
        result={JSON.stringify({ approved: false })}
      />,
    );

    expect(screen.getByText("Declined — no changes made")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
