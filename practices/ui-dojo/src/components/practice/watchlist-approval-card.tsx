import { useState } from "react";
import {
  CheckCircle2,
  LoaderCircle,
  ShieldQuestion,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type ApprovalStatus = "inProgress" | "executing" | "complete";

type Props = {
  action: "add" | "remove";
  filmId?: string;
  filmTitle?: string;
  status: ApprovalStatus;
  result?: string;
  onApprove?: () => Promise<void>;
  onDecline?: () => Promise<void>;
};

function completedDecision(result?: string) {
  if (!result) return undefined;
  try {
    const decoded = JSON.parse(result) as { approved?: unknown };
    return typeof decoded.approved === "boolean" ? decoded.approved : undefined;
  } catch {
    return undefined;
  }
}

/** Explicit approval boundary for agent-requested watchlist writes. */
export function WatchlistApprovalCard({
  action,
  filmId,
  filmTitle,
  status,
  result,
  onApprove,
  onDecline,
}: Props) {
  const [pending, setPending] = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState("");
  const approved =
    status === "complete" ? completedDecision(result) : undefined;
  const verb = action === "add" ? "Add" : "Remove";

  async function decide(
    decision: "approve" | "decline",
    callback: (() => Promise<void>) | undefined,
  ) {
    if (!callback || pending) return;
    setPending(decision);
    setError("");
    try {
      await callback();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "The request failed",
      );
      setPending(null);
    }
  }

  return (
    <section
      aria-label="Watchlist approval"
      className="my-2 overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm"
    >
      <div className="flex items-start gap-3 border-b bg-amber-50/70 px-4 py-3 dark:bg-amber-950/20">
        <ShieldQuestion
          className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="font-medium">Approve watchlist change?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {status === "inProgress"
              ? "Preparing the requested change…"
              : `${verb} ${filmTitle || "this film"} ${action === "add" ? "to" : "from"} your watchlist.`}
          </p>
          {filmId && (
            <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
              Film ID: {filmId}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        {status === "executing" && (
          <>
            <p className="text-xs text-muted-foreground">
              No watchlist data changes until you approve this request.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending !== null}
                onClick={() => void decide("decline", onDecline)}
              >
                {pending === "decline" ? "Declining…" : "Decline"}
              </Button>
              <Button
                type="button"
                disabled={pending !== null}
                onClick={() => void decide("approve", onApprove)}
              >
                {pending === "approve" ? "Applying…" : `Approve ${action}`}
              </Button>
            </div>
          </>
        )}

        {status === "complete" && (
          <div className="flex items-center gap-2 text-sm" role="status">
            {approved ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : (
              <XCircle className="size-4 text-muted-foreground" />
            )}
            <span>
              {approved
                ? "Approved and completed"
                : approved === false
                  ? "Declined — no changes made"
                  : "Approval response recorded"}
            </span>
          </div>
        )}

        {status === "inProgress" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Waiting for complete request details…
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
