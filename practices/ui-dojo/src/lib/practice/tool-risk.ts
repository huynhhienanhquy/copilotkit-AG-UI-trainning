export type ToolRiskLevel =
  | "no_confirmation"
  | "undoable"
  | "confirmation_required";

const PRACTICE_TOOL_RISK: Readonly<Record<string, ToolRiskLevel>> = {
  present_plan: "no_confirmation",
  set_theme: "no_confirmation",
  set_conversation_sidebar: "no_confirmation",
  open_conversation_search: "no_confirmation",
  show_attachment: "no_confirmation",
  list_watchlist: "no_confirmation",
  find_conversations: "no_confirmation",
  extract_attachment: "no_confirmation",
  ghibliFilms: "no_confirmation",
  ghibliCharacters: "no_confirmation",
  update_conversation: "undoable",
  add_watchlist_film: "undoable",
  remove_watchlist_film: "undoable",
  delete_conversation: "confirmation_required",
  delete_attachment: "confirmation_required",
};

/**
 * Resolve the user-control boundary for an agent tool. Explicit policy wins;
 * unknown create/update/delete-shaped tools fail closed and require approval.
 */
export function practiceToolRisk(name: string): ToolRiskLevel {
  const configured = PRACTICE_TOOL_RISK[name];
  if (configured) return configured;
  return /^(add|create|delete|remove|rename|set|update)_/i.test(name)
    ? "confirmation_required"
    : "no_confirmation";
}

export function requiresToolConfirmation(name: string): boolean {
  return practiceToolRisk(name) === "confirmation_required";
}
