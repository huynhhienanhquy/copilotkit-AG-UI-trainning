import {
  useAgentContext,
  useDefaultRenderTool,
  useFrontendTool,
  useHumanInTheLoop,
  useRenderTool,
} from "@copilotkit/react-core/v2";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import type {
  Attachment,
  AttachmentPreviewTarget,
  Conversation,
  ConversationSearchPage,
  Extraction,
  Film,
  ThreadPatch,
  WatchlistItem,
} from "@/lib/practice/contracts";
import { threadPatchSchema } from "@/lib/practice/contracts";
import { practiceApi } from "@/lib/practice/api";
import { planningTimelineSchema } from "@/lib/practice/planning";
import { requiresToolConfirmation } from "@/lib/practice/tool-risk";
import type { UndoToastRequest } from "./undo-toast";
import { ConversationSearchCard } from "./conversation-search-card";
import { PlanningTimeline } from "./planning-timeline";
import { WatchlistApprovalCard } from "./watchlist-approval-card";

const watchlistApprovalSchema = z
  .object({
    filmId: z.string().uuid(),
    filmTitle: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .describe("Catalog title shown to the user for approval."),
  })
  .strict();

type Props = {
  thread: Conversation;
  files: Attachment[];
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
  onSearch: (query: string, archived: boolean) => void;
  onSelectConversation: (id: string) => void;
  onShowFile: (id: string, target?: AttachmentPreviewTarget) => void;
  onWatchlist: () => void;
  onDelete: () => void;
  onDeleteFile: (file: Attachment) => void;
  onUpdateConversation: (
    id: string,
    patch: ThreadPatch,
  ) => Promise<Conversation>;
  showUndo: (request: UndoToastRequest) => void;
};

/** Register tools beneath the chat provider; restored results only render and never execute handlers. */
export function PracticeTools(props: Props) {
  const { theme, setTheme } = useTheme();
  const client = useQueryClient();

  async function refreshPracticeData() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["practice", "watchlist"] }),
      client.invalidateQueries({ queryKey: ["practice", "threads"] }),
      client.invalidateQueries({ queryKey: ["practice", "search"] }),
    ]);
  }

  async function addWatchlistFilm(filmId: string, announce = true) {
    const result = await practiceApi<{
      status: "added" | "already_exists";
      film: Film;
    }>(`/watchlist/${filmId}`, { method: "PUT" });
    await refreshPracticeData();
    if (announce && result.status === "added")
      props.showUndo({
        message: `${result.film.title} added to watchlist`,
        onUndo: async () => {
          await removeWatchlistFilm(filmId, false);
        },
      });
    return result;
  }

  async function removeWatchlistFilm(filmId: string, announce = true) {
    let film = client
      .getQueryData<WatchlistItem[]>(["practice", "watchlist"])
      ?.find((item) => item.id === filmId);
    if (!film) {
      const current = await practiceApi<WatchlistItem[]>("/watchlist");
      film = current.find((item) => item.id === filmId);
    }
    const result = await practiceApi<{
      status: "removed" | "not_found";
      filmId: string;
    }>(`/watchlist/${filmId}`, { method: "DELETE" });
    await refreshPracticeData();
    if (announce && result.status === "removed")
      props.showUndo({
        message: `${film?.title || "Film"} removed from watchlist`,
        onUndo: async () => {
          await addWatchlistFilm(filmId, false);
        },
      });
    return result;
  }
  useAgentContext({
    description:
      "Current Ghibli Practice UI and attachment metadata (data only)",
    value: {
      threadId: props.thread.id,
      title: props.thread.title,
      theme,
      sidebarExpanded: props.expanded,
      attachments: props.files.map(({ id, filename }) => ({ id, filename })),
    },
  });
  useFrontendTool({
    name: "present_plan",
    description:
      "Display one concise execution plan before a request that needs two or more distinct actions. Provide only user-visible action labels. Never include reasoning, hidden analysis, alternatives, or chain-of-thought. Skip this tool for a single action or a simple answer.",
    parameters: planningTimelineSchema,
    handler: async ({ steps }) => ({
      status: "presented",
      stepCount: steps.length,
    }),
    render: ({ args, status }) => (
      <PlanningTimeline
        title={args.title}
        steps={args.steps}
        complete={status === "complete"}
      />
    ),
  });
  useFrontendTool({
    name: "set_theme",
    description: "Change the application theme.",
    parameters: z.object({
      mode: z.enum(["light", "dark", "system", "toggle"]),
    }),
    handler: async ({ mode }) => {
      const next =
        mode === "toggle"
          ? document.documentElement.classList.contains("dark")
            ? "light"
            : "dark"
          : mode;
      setTheme(next);
      return { theme: next };
    },
  });
  useFrontendTool({
    name: "set_conversation_sidebar",
    description: "Expand or collapse the conversation sidebar.",
    parameters: z.object({ expanded: z.boolean() }),
    handler: async ({ expanded }) => {
      props.onExpand(expanded);
      return { expanded };
    },
  });
  useFrontendTool({
    name: "open_conversation_search",
    description:
      "Open the saved-conversation search popup with an optional query and archived filter.",
    parameters: z.object({
      query: z.string().max(200).optional(),
      includeArchived: z.boolean().optional(),
    }),
    handler: async ({ query, includeArchived }) => {
      props.onSearch(query || "", includeArchived || false);
      return { opened: true, query: query || "" };
    },
  });
  useFrontendTool({
    name: "show_attachment",
    description:
      "Open a preview of a file attached to this conversation, optionally focused on an extracted source range.",
    parameters: z.object({
      attachmentId: z.string().uuid(),
      page: z.number().int().min(1).optional(),
      start: z.number().int().min(0).optional(),
      end: z.number().int().min(1).optional(),
    }),
    handler: async ({ attachmentId, page, start, end }) => {
      if (!props.files.some((file) => file.id === attachmentId))
        return { error: "Attachment not found in this conversation" };
      const target =
        page !== undefined &&
        start !== undefined &&
        end !== undefined &&
        end > start
          ? { page, start, end }
          : undefined;
      props.onShowFile(attachmentId, target);
      return { opened: true, attachmentId, target };
    },
  });
  useFrontendTool({
    name: "update_conversation",
    description:
      "Rename, archive/unarchive or pin/unpin a conversation. This action is reversible and the UI offers Undo.",
    parameters: z.object({
      threadId: z.string().uuid(),
      patch: threadPatchSchema,
    }),
    handler: async ({ threadId, patch }) =>
      props.onUpdateConversation(threadId, patch),
  });
  useHumanInTheLoop({
    name: "add_watchlist_film",
    description:
      "Request approval to add a real Ghibli film to the watchlist. Always provide the exact catalog title. The UI will not change data until the user approves.",
    parameters: watchlistApprovalSchema,
    render: (tool) => {
      if (tool.status === "executing") {
        const { args, respond } = tool;
        return (
          <WatchlistApprovalCard
            action="add"
            filmId={args.filmId}
            filmTitle={args.filmTitle}
            status={tool.status}
            onApprove={async () => {
              const result = await addWatchlistFilm(args.filmId);
              await respond({ approved: true, action: "add", result });
            }}
            onDecline={() =>
              respond({
                approved: false,
                action: "add",
                message: "The user declined the watchlist change.",
              })
            }
          />
        );
      }
      return (
        <WatchlistApprovalCard
          action="add"
          filmId={tool.args.filmId}
          filmTitle={tool.args.filmTitle}
          status={tool.status}
          result={tool.result}
        />
      );
    },
  });
  useHumanInTheLoop({
    name: "remove_watchlist_film",
    description:
      "Request approval to remove a film from the watchlist. Always provide the exact saved title. The UI will not change data until the user approves.",
    parameters: watchlistApprovalSchema,
    render: (tool) => {
      if (tool.status === "executing") {
        const { args, respond } = tool;
        return (
          <WatchlistApprovalCard
            action="remove"
            filmId={args.filmId}
            filmTitle={args.filmTitle}
            status={tool.status}
            onApprove={async () => {
              const result = await removeWatchlistFilm(args.filmId);
              await respond({ approved: true, action: "remove", result });
            }}
            onDecline={() =>
              respond({
                approved: false,
                action: "remove",
                message: "The user declined the watchlist change.",
              })
            }
          />
        );
      }
      return (
        <WatchlistApprovalCard
          action="remove"
          filmId={tool.args.filmId}
          filmTitle={tool.args.filmTitle}
          status={tool.status}
          result={tool.result}
        />
      );
    },
  });
  useFrontendTool({
    name: "delete_conversation",
    description:
      "Show the delete action for the current conversation. The user can delete after this response finishes.",
    parameters: z.object({ threadId: z.string().uuid() }),
    handler: async ({ threadId }) => {
      if (!requiresToolConfirmation("delete_conversation"))
        throw new Error("Delete conversation must require confirmation");
      if (threadId !== props.thread.id)
        return { error: "Use the conversation menu to delete another thread" };
      props.onDelete();
      return {
        status: "awaiting_user_action",
        message:
          "Delete action shown. The conversation has not yet been deleted.",
      };
    },
  });
  useFrontendTool({
    name: "delete_attachment",
    description:
      "Request deletion of a draft file. This only opens a confirmation dialog; it never deletes immediately.",
    parameters: z.object({ attachmentId: z.string().uuid() }),
    handler: async ({ attachmentId }) => {
      if (!requiresToolConfirmation("delete_attachment"))
        throw new Error("Delete attachment must require confirmation");
      const file = props.files.find((item) => item.id === attachmentId);
      if (!file) return { error: "Attachment not found in this conversation" };
      if (file.messageId)
        return {
          error:
            "Saved attachments are removed with their conversation. Delete the conversation instead.",
        };
      props.onDeleteFile(file);
      return {
        status: "awaiting_user_confirmation",
        message: "File deletion has not been performed.",
      };
    },
  });
  useRenderTool({
    name: "list_watchlist",
    parameters: z.object({}),
    render: ({ status, result }) => {
      let decoded: unknown = result;
      if (typeof result === "string") {
        try {
          decoded = JSON.parse(result);
        } catch {
          decoded = null;
        }
      }
      const films = Array.isArray(decoded)
        ? (decoded as WatchlistItem[])
        : null;
      return (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="font-medium">Ghibli watchlist</p>
          {status !== "complete" ? (
            <p>Loading…</p>
          ) : films === null ? (
            <p role="alert">The watchlist could not be loaded.</p>
          ) : films.length ? (
            <ul>
              {films.map((film) => (
                <li key={film.id}>
                  {film.title} ({film.releaseYear})
                </li>
              ))}
            </ul>
          ) : (
            <p>No films saved yet.</p>
          )}
          <Button variant="outline" size="sm" onClick={props.onWatchlist}>
            Open current watchlist
          </Button>
        </div>
      );
    },
  });
  useRenderTool({
    name: "extract_attachment",
    parameters: z.object({
      attachmentId: z.string().uuid(),
      offset: z.number().int().min(0).optional(),
    }),
    render: ({ status, result }) => {
      let decoded: unknown = result;
      if (typeof result === "string") {
        try {
          decoded = JSON.parse(result);
        } catch {
          decoded = null;
        }
      }
      const extraction =
        decoded &&
        typeof decoded === "object" &&
        typeof (decoded as Extraction).attachmentId === "string" &&
        Array.isArray((decoded as Extraction).chunks)
          ? (decoded as Extraction)
          : null;
      const file = extraction
        ? props.files.find((item) => item.id === extraction.attachmentId)
        : undefined;
      return (
        <div className="my-2 space-y-2 rounded-lg border p-3">
          <div>
            <p className="font-medium">Document sources</p>
            <p className="text-xs text-muted-foreground">
              {status !== "complete"
                ? "Extracting page-aware passages…"
                : extraction
                  ? `${extraction.filename} · characters ${extraction.offset + 1}\u2013${extraction.offset + extraction.text.length}`
                  : "Source passages unavailable"}
            </p>
          </div>
          {file && extraction && (
            <div className="flex flex-wrap gap-2">
              {extraction.chunks.map((chunk) => (
                <Button
                  key={`${chunk.page}-${chunk.start}-${chunk.end}`}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto whitespace-normal text-left"
                  title={`Characters ${chunk.start + 1}\u2013${chunk.end}`}
                  onClick={() =>
                    props.onShowFile(file.id, {
                      page: chunk.page,
                      start: chunk.start,
                      end: chunk.end,
                    })
                  }
                >
                  {chunk.filename} · p. {chunk.page} · {chunk.start + 1}\u2013
                  {chunk.end}
                </Button>
              ))}
            </div>
          )}
        </div>
      );
    },
  });
  useRenderTool({
    name: "find_conversations",
    parameters: z.object({
      query: z.string().max(200).optional(),
      scope: z.enum(["active", "archived", "all"]).optional(),
      updatedFrom: z.string().optional(),
      updatedTo: z.string().optional(),
      hasAttachments: z.boolean().optional(),
      page: z.number().int().min(0).optional(),
    }),
    render: ({ status, result }) => {
      let decoded: unknown = result;
      if (typeof result === "string") {
        try {
          decoded = JSON.parse(result);
        } catch {
          decoded = null;
        }
      }
      const page =
        decoded &&
        typeof decoded === "object" &&
        Array.isArray((decoded as ConversationSearchPage).items)
          ? (decoded as ConversationSearchPage)
          : null;
      return (
        <div className="my-2 space-y-3 rounded-lg border p-3">
          <div>
            <p className="font-medium">Conversation search</p>
            <p className="text-xs text-muted-foreground">
              {status !== "complete"
                ? "Searching…"
                : page
                  ? `${page.total} result${page.total === 1 ? "" : "s"} · ${page.searchMode} ranking`
                  : "Search results unavailable"}
            </p>
          </div>
          {page?.items.map((conversation) => (
            <ConversationSearchCard
              key={conversation.id}
              result={conversation}
              onOpen={props.onSelectConversation}
            />
          ))}
          {page?.hasMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => props.onSearch("", true)}
            >
              Open search for more results
            </Button>
          )}
        </div>
      );
    },
  });
  useDefaultRenderTool({
    render: ({ name, status, result }) => (
      <details className="my-2 max-w-full rounded-lg border p-3 text-sm">
        <summary className="cursor-pointer">
          {name.replaceAll("_", " ")} ·{" "}
          {status === "complete" ? "Finished" : "Working…"}
        </summary>
        {result !== undefined && (
          <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-all text-xs">
            {typeof result === "string"
              ? result
              : JSON.stringify(result, null, 2)}
          </pre>
        )}
      </details>
    ),
  });
  return null;
}
