import { describe, expect, it } from "vitest";
import { practiceToolRisk, requiresToolConfirmation } from "./tool-risk";

describe("practice tool risk policy", () => {
  it("runs harmless display tools without confirmation", () => {
    expect(practiceToolRisk("set_theme")).toBe("no_confirmation");
    expect(practiceToolRisk("set_conversation_sidebar")).toBe(
      "no_confirmation",
    );
    expect(practiceToolRisk("open_conversation_search")).toBe(
      "no_confirmation",
    );
  });

  it("marks reversible conversation and watchlist mutations as undoable", () => {
    expect(practiceToolRisk("update_conversation")).toBe("undoable");
    expect(practiceToolRisk("add_watchlist_film")).toBe("undoable");
    expect(practiceToolRisk("remove_watchlist_film")).toBe("undoable");
  });

  it("requires confirmation for destructive and unknown mutation tools", () => {
    expect(requiresToolConfirmation("delete_conversation")).toBe(true);
    expect(requiresToolConfirmation("delete_attachment")).toBe(true);
    expect(requiresToolConfirmation("add_external_item")).toBe(true);
    expect(requiresToolConfirmation("delete_unknown_resource")).toBe(true);
  });
});
