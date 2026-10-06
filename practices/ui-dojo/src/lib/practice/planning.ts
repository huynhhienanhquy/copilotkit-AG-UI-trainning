import { z } from "zod";

/** Public, user-facing plan data. Deliberately excludes reasoning fields. */
export const planningTimelineSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .describe("A short outcome-oriented title for the plan."),
    steps: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(120)
          .describe("One concise, user-visible action."),
      )
      .min(2)
      .max(6)
      .describe("Ordered actions only; never include private reasoning."),
  })
  .strict();

export type PlanningTimeline = z.infer<typeof planningTimelineSchema>;
