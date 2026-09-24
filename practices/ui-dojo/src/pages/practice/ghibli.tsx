import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-core/v2/styles.css";
import { PanelLeft, Search, Film, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { practiceApi, practiceUrl } from "@/lib/practice/api";
import type { Attachment, Conversation, Page, ThreadPatch } from "@/lib/practice/contracts";
import { ConversationSidebar } from "@/components/practice/conversation-sidebar";
import { ConversationSearch } from "@/components/practice/conversation-search";
import { WatchlistPanel } from "@/components/practice/watchlist-panel";
import { AttachmentPreview } from "@/components/practice/attachment-preview";
import { GhibliChat } from "@/components/practice/ghibli-chat";

/** Compose the practice page with independent responsive conversation navigation and durable data. */
export function GhibliPracticePage() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const mobile = useIsMobile();
  const [expanded, setExpanded] = useState(() => localStorage.getItem("practice-sidebar") !== "collapsed");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scope, setScope] = useState<"active" | "archived">("active");
  const [search, setSearch] = useState<{ query: string; includeArchived: boolean } | null>(null);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [file, setFile] = useState<Attachment | null>(null);
  const [deleting, setDeleting] = useState<Conversation | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [error, setError] = useState("");
  const threads = useInfiniteQuery({ queryKey: ["practice", "threads", scope], initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => practiceApi<Page<Conversation>>(`/threads?scope=${scope}&page=${pageParam}`, { signal }),
    getNextPageParam: (page) => page.hasMore ? page.page + 1 : undefined });
  const thread = useQuery({ queryKey: ["practice", "thread", threadId], enabled: !!threadId,
    queryFn: ({ signal }) => practiceApi<Conversation>(`/threads/${threadId}`, { signal }), retry: false });
  const mutation = useMutation({ mutationFn: ({ id, patch }: { id: string; patch: ThreadPatch }) => practiceApi<Conversation>(`/threads/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["practice"] }), onError: (failure) => setError(failure.message) });
  const create = useMutation({ mutationFn: () => practiceApi<Conversation>("/threads", { method: "POST" }),
    onSuccess: async (created) => { await client.invalidateQueries({ queryKey: ["practice", "threads"] }); navigate(`/practice/ghibli/chat/${created.id}`); setMobileOpen(false); }, onError: (failure) => setError(failure.message) });
  const remove = useMutation({ mutationFn: (id: string) => practiceApi(`/threads/${id}`, { method: "DELETE" }),
    onSuccess: async (_, id) => { setDeleting(null); client.removeQueries({ queryKey: ["practice", "thread", id] });
      await client.invalidateQueries({ queryKey: ["practice"] }); if (id === threadId) { localStorage.removeItem("practice-last-thread"); navigate("/practice/ghibli", { replace: true }); } }, onError: (failure) => setError(failure.message) });

  useEffect(() => {
    if (thread.data) localStorage.setItem("practice-last-thread", thread.data.id);
  }, [thread.data]);
  useEffect(() => {
    if (threadId) return;
    const last = localStorage.getItem("practice-last-thread");
    if (!last) return;
    const controller = new AbortController();
    practiceApi<Conversation>(`/threads/${last}`, { signal: controller.signal }).then((saved) => navigate(`/practice/ghibli/chat/${saved.id}`, { replace: true })).catch(() => { if (!controller.signal.aborted) localStorage.removeItem("practice-last-thread"); });
    return () => controller.abort();
  }, [threadId, navigate]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearch({ query: "", includeArchived: false }); } };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, []);

  /** Apply conversation-sidebar preference without touching the outer demo navigation. */
  const setSidebar = useCallback((open: boolean) => {
    if (mobile) setMobileOpen(open);
    else { setExpanded(open); localStorage.setItem("practice-sidebar", open ? "expanded" : "collapsed"); }
  }, [mobile]);
  const openSearch = useCallback((query: string, includeArchived: boolean) => setSearch({ query, includeArchived }), []);
  const reportBusy = useCallback((busy: boolean) => setChatBusy(busy), []);
  const select = (id: string) => { setChatBusy(false); navigate(`/practice/ghibli/chat/${id}`); setMobileOpen(false); };
  const sidebar = <ConversationSidebar threads={threads.data?.pages.flatMap((page) => page.items) || []} activeId={threadId} scope={scope}
    loading={threads.isPending} error={threads.error?.message} busy={mutation.isPending || create.isPending || remove.isPending}
    hasMore={threads.hasNextPage} onMore={() => void threads.fetchNextPage()} onCreate={() => create.mutate()} onSelect={select}
    onScope={setScope} onSearch={() => openSearch("", false)} onRetry={() => void threads.refetch()}
    onUpdate={async (id, patch) => { await mutation.mutateAsync({ id, patch }); }} onDelete={setDeleting} />;
  return <section aria-label="Ghibli Practice" className="flex h-full min-h-0 w-full overflow-hidden rounded-xl border bg-background">
    {!mobile && expanded && <aside className="w-64 shrink-0 border-r bg-muted/20">{sidebar}</aside>}
    <Sheet open={mobile && mobileOpen} onOpenChange={setMobileOpen}><SheetContent side="left" className="w-80 p-0 pt-10"><SheetTitle className="sr-only">Conversations</SheetTitle><SheetDescription className="sr-only">Manage and open saved Ghibli conversations.</SheetDescription>{sidebar}</SheetContent></Sheet>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b p-3">
        <Button variant="ghost" size="icon" aria-label="Toggle conversation sidebar" onClick={() => setSidebar(mobile ? !mobileOpen : !expanded)}><PanelLeft /></Button>
        <div className="min-w-0 flex-1"><h1 className="truncate font-semibold">{thread.data?.title || "Ghibli Practice"}</h1><p className="text-xs text-muted-foreground">Films, files & a workspace that listens</p></div>
        <Button variant="ghost" size="icon" onClick={() => create.mutate()} disabled={create.isPending} aria-label="New conversation"><Plus /></Button>
        <Button variant="ghost" size="icon" onClick={() => openSearch("", false)} aria-label="Open search"><Search /></Button>
        <Button variant="outline" onClick={() => setWatchlistOpen(true)}><Film /><span className="hidden sm:inline">Watchlist</span></Button><ThemeToggle />
      </header>
      {error && <div role="alert" className="flex items-center justify-between bg-destructive/10 px-4 py-2 text-sm"><p>{error}</p><Button variant="ghost" onClick={() => setError("")}>Dismiss</Button></div>}
      <div className="min-h-0 flex-1">
        {!threadId && <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center"><span className="text-5xl" aria-hidden>🌱</span><h2 className="text-2xl font-semibold">Your next Ghibli adventure</h2><p className="max-w-md text-muted-foreground">Create a conversation to explore films, save a watchlist, read documents and try the workspace tools.</p><Button disabled={create.isPending} onClick={() => create.mutate()}>Start a conversation</Button></div>}
        {threadId && thread.isPending && <p role="status" className="p-6">Loading conversation…</p>}
        {thread.error && <div role="alert" className="p-6"><p>{thread.error.message}</p><Button onClick={() => void thread.refetch()}>Retry</Button><Button variant="outline" onClick={() => { localStorage.removeItem("practice-last-thread"); navigate("/practice/ghibli"); }}>Back to practice</Button></div>}
        {thread.data && <CopilotKit key={thread.data.id} agent="ghibliAgent" runtimeUrl={practiceUrl("/copilotkit")}>
          <GhibliChat thread={thread.data} expanded={mobile ? mobileOpen : expanded} onExpand={setSidebar} onSearch={openSearch} onShowFile={setFile}
            onWatchlist={() => setWatchlistOpen(true)} onDelete={() => setDeleting(thread.data)} onBusy={reportBusy} />
        </CopilotKit>}
      </div>
    </div>
    {search && <ConversationSearch {...search} onClose={() => setSearch(null)} onSelect={select} />}
    {watchlistOpen && <WatchlistPanel onClose={() => setWatchlistOpen(false)} />}
    {file && <AttachmentPreview key={file.id} file={file} onClose={() => setFile(null)} />}
    <Dialog open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null); }}><DialogContent><DialogHeader><DialogTitle>Delete conversation?</DialogTitle><DialogDescription>“{deleting?.title}” and its saved messages and files will be removed. Your watchlist will remain.</DialogDescription></DialogHeader>
      {chatBusy && deleting?.id === threadId && <p role="status">Wait for this response to finish or stop it before deleting.</p>}
      {remove.error && <p role="alert">{remove.error.message}</p>}
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" disabled={remove.isPending || chatBusy && deleting?.id === threadId} onClick={() => { if (deleting) remove.mutate(deleting.id); }}>Delete conversation</Button></div>
    </DialogContent></Dialog>
  </section>;
}
