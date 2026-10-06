import { CheckCircle2, ListChecks, LoaderCircle } from "lucide-react";

type Props = {
  title?: string;
  steps?: readonly string[];
  complete: boolean;
};

/** Render only the agent's public action outline, never model reasoning content. */
export function PlanningTimeline({ title, steps = [], complete }: Props) {
  return (
    <section
      aria-label="Agent plan"
      className="my-2 overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b bg-muted/35 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ListChecks className="size-4 text-primary" aria-hidden="true" />
            <span className="truncate">{title || "Planning the request"}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Concise execution outline
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
          {complete ? (
            <CheckCircle2 className="size-3.5 text-emerald-600" />
          ) : (
            <LoaderCircle className="size-3.5 animate-spin text-primary" />
          )}
          {complete ? "Plan ready" : "Planning…"}
        </span>
      </div>
      {steps.length > 0 && (
        <ol className="px-4 py-3" aria-label="Plan steps">
          {steps.map((step, index) => (
            <li
              key={`${index}-${step}`}
              className="relative flex min-w-0 gap-3 pb-3 last:pb-0"
            >
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-[11px] top-6 h-[calc(100%-0.25rem)] w-px bg-border"
                />
              )}
              <span className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background text-[11px] font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <span className="min-w-0 pt-0.5 text-sm leading-5">{step}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
