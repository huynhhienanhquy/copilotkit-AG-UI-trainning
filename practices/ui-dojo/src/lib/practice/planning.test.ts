import { describe, expect, it } from "vitest";
import { planningTimelineSchema } from "./planning";

describe("planning timeline contract", () => {
  it("accepts a concise, ordered public plan", () => {
    expect(
      planningTimelineSchema.parse({
        title: "Update the workspace",
        steps: ["Find the conversation", "Archive it", "Verify the result"],
      }),
    ).toEqual({
      title: "Update the workspace",
      steps: ["Find the conversation", "Archive it", "Verify the result"],
    });
  });

  it("requires a genuinely multi-step plan and keeps it bounded", () => {
    expect(() =>
      planningTimelineSchema.parse({ title: "One step", steps: ["Do it"] }),
    ).toThrow();
    expect(() =>
      planningTimelineSchema.parse({
        title: "Too many steps",
        steps: Array.from({ length: 7 }, (_, index) => `Step ${index + 1}`),
      }),
    ).toThrow();
  });

  it("rejects reasoning or analysis payloads", () => {
    expect(() =>
      planningTimelineSchema.parse({
        title: "Public plan",
        steps: ["Inspect the request", "Complete the action"],
        reasoning: "private chain of thought",
      }),
    ).toThrow();
  });
});
