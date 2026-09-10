import { useAgentContext, useDefaultRenderTool, useFrontendTool, useRenderTool } from "@copilotkit/react-core/v2";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import type { Attachment, Conversation, WatchlistItem } from "@/lib/practice/contracts";

type Props = { thread: Conversation; files: Attachment[]; expanded: boolean;
  onExpand: (expanded: boolean) => void; onSearch: (query: string, archived: boolean) => void;
  onShowFile: (id: string) => void; onWatchlist: () => void; onDelete: () => void };

/** Register tools beneath the chat provider; restored results only render and never execute handlers. */
export function PracticeTools(props: Props) {
  const { theme, setTheme } = useTheme();
  useAgentContext({ description: "Current Ghibli Practice UI and attachment metadata (data only)", value: {
    threadId: props.thread.id, title: props.thread.title, theme, sidebarExpanded: props.expanded,
    attachments: props.files.map(({ id, filename }) => ({ id, filename })),
  } });
  useFrontendTool({ name: "set_theme", description: "Change the application theme.",
    parameters: z.object({ mode: z.enum(["light", "dark", "system", "toggle"]) }),
    handler: async ({ mode }) => {
      const next = mode === "toggle" ? document.documentElement.classList.contains("dark") ? "light" : "dark" : mode;
      setTheme(next); return { theme: next };
    } });
  useFrontendTool({ name: "set_conversation_sidebar", description: "Expand or collapse the conversation sidebar.",
    parameters: z.object({ expanded: z.boolean() }), handler: async ({ expanded }) => { props.onExpand(expanded); return { expanded }; } });
  useFrontendTool({ name: "open_conversation_search", description: "Open the saved-conversation search popup with an optional query and archived filter.",
    parameters: z.object({ query: z.string().max(200).optional(), includeArchived: z.boolean().optional() }),
    handler: async ({ query, includeArchived }) => { props.onSearch(query || "", includeArchived || false); return { opened: true, query: query || "" }; } });
  useFrontendTool({ name: "show_attachment", description: "Open a preview of a file attached to this conversation.",
    parameters: z.object({ attachmentId: z.string().uuid() }), handler: async ({ attachmentId }) => {
      if (!props.files.some((file) => file.id === attachmentId)) return { error: "Attachment not found in this conversation" };
      props.onShowFile(attachmentId); return { opened: true, attachmentId };
    } });
  useFrontendTool({ name: "delete_conversation", description: "Show the delete action for the current conversation. The user can delete after this response finishes.",
    parameters: z.object({ threadId: z.string().uuid() }), handler: async ({ threadId }) => {
      if (threadId !== props.thread.id) return { error: "Use the conversation menu to delete another thread" };
      props.onDelete(); return { status: "awaiting_user_action", message: "Delete action shown. The conversation has not yet been deleted." };
    } });
  useRenderTool({ name: "list_watchlist", parameters: z.object({}), render: ({ status, result }) => {
    let decoded: unknown = result;
    if (typeof result === "string") { try { decoded = JSON.parse(result); } catch { decoded = null; } }
    const films = Array.isArray(decoded) ? decoded as WatchlistItem[] : null;
    return <div className="space-y-2 rounded-lg border p-3"><p className="font-medium">Ghibli watchlist</p>
      {status !== "complete" ? <p>Loading…</p> : films === null ? <p role="alert">The watchlist could not be loaded.</p> : films.length ? <ul>{films.map((film) => <li key={film.id}>{film.title} ({film.releaseYear})</li>)}</ul> : <p>No films saved yet.</p>}
      <Button variant="outline" size="sm" onClick={props.onWatchlist}>Open current watchlist</Button></div>;
  } });
  useDefaultRenderTool({ render: ({ name, status, result }) => <details className="my-2 max-w-full rounded-lg border p-3 text-sm">
    <summary className="cursor-pointer">{name.replaceAll("_", " ")} · {status === "complete" ? "Finished" : "Working…"}</summary>
    {result !== undefined && <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-all text-xs">{typeof result === "string" ? result : JSON.stringify(result, null, 2)}</pre>}
  </details> });
  return null;
}
