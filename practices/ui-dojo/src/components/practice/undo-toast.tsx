import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type UndoToastRequest = {
  message: string;
  onUndo: () => Promise<void> | void;
};

type UndoToast = UndoToastRequest & { id: number };

/** Own one short-lived practice notification; a newer reversible action replaces it. */
export function useUndoToast(timeout = 7_000) {
  const [toast, setToast] = useState<UndoToast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);
  const showUndo = useCallback(
    (request: UndoToastRequest) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ ...request, id: Date.now() });
      timer.current = setTimeout(() => setToast(null), timeout);
    },
    [timeout],
  );
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return { toast, showUndo, dismiss };
}

export function UndoToastViewport({
  toast,
  onDismiss,
}: {
  toast: UndoToast | null;
  onDismiss: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  if (!toast) return null;
  return (
    <div
      className="fixed right-4 bottom-4 z-[100] flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-lg border bg-background p-3 shadow-lg"
      role="status"
      aria-live="polite"
    >
      <div className="min-w-0 text-sm">
        <p>
          {toast.message} <span aria-hidden>—</span>
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <Button
        variant="link"
        size="sm"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError("");
          try {
            await toast.onUndo();
            onDismiss();
          } catch (failure) {
            setPending(false);
            setError(
              failure instanceof Error ? failure.message : "Undo failed",
            );
          }
        }}
      >
        {pending ? "Undoing…" : "Undo"}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Dismiss notification"
        onClick={onDismiss}
      >
        <X />
      </Button>
    </div>
  );
}
