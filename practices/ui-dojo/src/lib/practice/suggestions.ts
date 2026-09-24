import type { Attachment, Conversation, WatchlistItem } from "./contracts";

export type PracticeSuggestion = { id: string; label: string; prompt?: string; action?: "upload" | "features" };

/** Offer executable examples appropriate to the current data, including inverse actions. */
export function getPracticeSuggestions({ thread, files, watchlist, dark, expanded }: {
  thread: Conversation; files: Attachment[]; watchlist: WatchlistItem[]; dark: boolean; expanded: boolean;
}): PracticeSuggestion[] {
  const suggestions: PracticeSuggestion[] = [
    { id: "theme", label: dark ? "Light theme" : "Dark theme", prompt: `Switch to ${dark ? "light" : "dark"} theme.` },
    { id: "sidebar", label: expanded ? "Collapse sidebar" : "Expand sidebar", prompt: `${expanded ? "Collapse" : "Expand"} the conversation sidebar.` },
    { id: "search", label: "Search conversations", prompt: "Open conversation search for Totoro." },
    { id: "watchlist", label: "Show watchlist", prompt: "Show my Ghibli watchlist." },
    { id: "upload", label: "Attach a document", action: "upload" },
    { id: "rename", label: "Rename this chat", prompt: "Rename this conversation to Ghibli weekend." },
    { id: "pin", label: thread.pinnedAt ? "Unpin chat" : "Pin chat", prompt: `${thread.pinnedAt ? "Unpin" : "Pin"} this conversation.` },
    { id: "archive", label: "Archive chat", prompt: "Archive this conversation." },
    { id: "unarchive", label: "Find archived chats", prompt: "Open conversation search and include archived conversations so I can restore one." },
    { id: "delete", label: "Delete this chat", prompt: "Show the action to delete this conversation." },
    { id: "facts", label: "Explore Ghibli", prompt: "Tell me about My Neighbor Totoro." },
  ];
  const film = ["Spirited Away", "My Neighbor Totoro", "Princess Mononoke"].find((title) => !watchlist.some((item) => item.title === title));
  if (film) suggestions.push({ id: "add-film", label: `Add ${film}`, prompt: `Add ${film} to my watchlist.` });
  if (watchlist[0]) suggestions.push({ id: "remove-film", label: `Remove ${watchlist[0].title}`, prompt: `Remove ${watchlist[0].title} from my watchlist.` });
  const file = files.at(-1);
  if (file) suggestions.push(
    { id: "show-file", label: `Show ${file.filename}`, prompt: `Show attachment ${file.filename} (ID ${file.id}).` },
    { id: "extract", label: "Extract document text", prompt: `Extract text from attachment ${file.filename} (ID ${file.id}).` },
  );
  return suggestions;
}
