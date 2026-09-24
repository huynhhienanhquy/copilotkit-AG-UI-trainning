import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { CopilotChatMessageView, CopilotChatConfigurationProvider, useAgent, useCopilotKit } from "@copilotkit/react-core/v2";
import type { Message } from "@ag-ui/core";
import { Paperclip, Send, Square, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTheme } from "@/components/theme-provider";
import { practiceApi } from "@/lib/practice/api";
import { getPracticeSuggestions, type PracticeSuggestion } from "@/lib/practice/suggestions";
import { MAX_FILE_BYTES, MAX_MESSAGE_FILES, PRACTICE_AGENT_ID, type Attachment, type Conversation, type Page, type WatchlistItem } from "@/lib/practice/contracts";
import { PracticeTools } from "./practice-tools";
import { initializeAgentSession } from "@/lib/practice/agent-session";

type Props = { thread: Conversation; expanded: boolean; onExpand: (expanded: boolean) => void;
  onSearch: (query: string, archived: boolean) => void; onShowFile: (file: Attachment) => void;
  onWatchlist: () => void; onDelete: () => void; onBusy: (busy: boolean) => void;
};

/** Hydrate the latest page before mounting a runtime; older pages are read-only message history. */
export function GhibliChat(props: Props) {
  const history = useInfiniteQuery({ queryKey: ["practice", "messages", props.thread.id], initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => practiceApi<Page<Message>>(`/threads/${props.thread.id}/messages?page=${pageParam}`, { signal }),
    getNextPageParam: (page) => page.hasMore ? page.page + 1 : undefined, refetchOnWindowFocus: false });
  if (history.isPending) return <p role="status" className="p-6">Restoring conversation…</p>;
  if (history.error) return <div role="alert" className="p-6">{history.error.message}<Button onClick={() => void history.refetch()}>Retry</Button></div>;
  return <ChatSession {...props} initialMessages={history.data.pages[0].items}
    olderMessages={history.data.pages.slice(1).reverse().flatMap((page) => page.items)}
    hasMore={history.hasNextPage} loadingMore={history.isFetchingNextPage} onMore={() => void history.fetchNextPage()} />;
}

/** Keep sending, tool execution and attachments in one lifecycle so thread changes can cancel safely. */
function ChatSession(props: Props & { initialMessages: Message[]; olderMessages: Message[]; hasMore: boolean; loadingMore: boolean; onMore: () => void }) {
  const { agent } = useAgent({ agentId: PRACTICE_AGENT_ID });
  const { copilotkit } = useCopilotKit();
  const { theme } = useTheme();
  const client = useQueryClient();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [trimmedHistory, setTrimmedHistory] = useState<Message[]>([]);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const uploadInput = useRef<HTMLInputElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const initial = useRef(props.initialMessages);
  const mounted = useRef(true);
  const sending = useRef(false);
  const pending = useRef<AbortController | null>(null);
  const { onBusy } = props;
  const files = useQuery({ queryKey: ["practice", "attachments", props.thread.id], queryFn: ({ signal }) => practiceApi<Attachment[]>(`/threads/${props.thread.id}/attachments`, { signal }) });
  const watchlist = useQuery({ queryKey: ["practice", "watchlist"], queryFn: ({ signal }) => practiceApi<WatchlistItem[]>("/watchlist", { signal }) });

  useEffect(() => {
    mounted.current = true;
    initializeAgentSession(agent, props.thread.id, initial.current);
    setReady(true);
    return () => { mounted.current = false; pending.current?.abort(); copilotkit.stopAgent({ agent }); };
  }, [agent, copilotkit, props.thread.id]);
  useEffect(() => { onBusy(busy || uploading); }, [busy, uploading, onBusy]);
  useEffect(() => {
    const container = scroll.current;
    if (container && container.scrollHeight - container.scrollTop - container.clientHeight < 250) container.scrollTop = container.scrollHeight;
  }, [agent.messages]);

  const allFiles = files.data || [];
  const suggestions = getPracticeSuggestions({ thread: props.thread, files: allFiles, watchlist: watchlist.data || [],
    dark: theme === "dark" || theme === "system" && document.documentElement.classList.contains("dark"), expanded: props.expanded });
  const messages = [...new Map([...props.olderMessages, ...trimmedHistory, ...agent.messages].map((message) => [message.id, message])).values()];

  /** Submit a stable user message and durable file references, then let CopilotKit execute tools. */
  async function send(text: string) {
    if (!ready || sending.current || uploading || props.thread.archivedAt || !text.trim() && !draftIds.length) return;
    sending.current = true; setBusy(true); setError("");
    const id = crypto.randomUUID();
    const controller = new AbortController();
    pending.current = controller;
    try {
      const message = await practiceApi<Message>(`/threads/${props.thread.id}/messages`, {
        method: "POST", body: JSON.stringify({ id, text: text.trim(), attachmentIds: draftIds }), signal: controller.signal,
      });
      if (!mounted.current || controller.signal.aborted) return;
      if (agent.messages.length > 80) {
        let start = agent.messages.length - 60;
        while (start < agent.messages.length && agent.messages[start].role !== "user") start++;
        setTrimmedHistory((previous) => [...previous, ...agent.messages.slice(0, start)]);
        agent.setMessages(agent.messages.slice(start));
      }
      agent.addMessage(message);
      setInput(""); setDraftIds([]);
      await copilotkit.runAgent({ agent });
    } catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : "The response failed. Please try again."); }
    finally {
      sending.current = false;
      if (mounted.current) { setBusy(false); await client.invalidateQueries({ queryKey: ["practice"] }); }
    }
  }

  /** Upload selected documents before sending; a failed file remains an explicit retryable error. */
  async function upload(selected: FileList | null) {
    if (!selected || busy || uploading) return;
    const chosen = Array.from(selected);
    if (chosen.length + draftIds.length > MAX_MESSAGE_FILES || chosen.some((file) => file.size > MAX_FILE_BYTES)) {
      setError("Attach at most three files, up to 10 MiB each."); return;
    }
    setUploading(true); setError("");
    const controller = new AbortController();
    pending.current = controller;
    try {
      for (const file of chosen) {
        if (!mounted.current || controller.signal.aborted) break;
        const form = new FormData(); form.set("file", file);
        const attachment = await practiceApi<Attachment>(`/threads/${props.thread.id}/attachments`, { method: "POST", body: form, signal: controller.signal });
        if (mounted.current) setDraftIds((ids) => [...ids, attachment.id]);
      }
      await client.invalidateQueries({ queryKey: ["practice", "attachments", props.thread.id] });
    } catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : "Upload failed"); }
    finally { if (mounted.current) setUploading(false); if (uploadInput.current) uploadInput.current.value = ""; }
  }

  /** Route suggestions through actual chat or upload actions and close the feature gallery. */
  function selectSuggestion(suggestion: PracticeSuggestion) {
    setShowFeatures(false);
    if (suggestion.action === "upload") uploadInput.current?.click();
    else if (suggestion.prompt) void send(suggestion.prompt);
  }

  return <CopilotChatConfigurationProvider agentId={PRACTICE_AGENT_ID} threadId={props.thread.id}>
    <PracticeTools {...props} files={allFiles} onShowFile={(id) => { const file = allFiles.find((item) => item.id === id); if (file) props.onShowFile(file); }} />
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scroll} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-8">
        {props.hasMore && <Button variant="outline" className="mb-4" onClick={props.onMore} disabled={props.loadingMore}>{props.loadingMore ? "Loading…" : "Load earlier messages"}</Button>}
        {!messages.length && <div className="mx-auto max-w-xl py-8 text-center"><span className="text-4xl" aria-hidden>🌿</span><h2 className="mt-4 text-2xl font-semibold">A little Ghibli magic</h2><p className="mt-2 text-muted-foreground">Explore films, build a watchlist, read documents, or ask me to change your workspace.</p></div>}
        <CopilotChatMessageView messages={messages} isRunning={busy} />
      </div>
      <div className="border-t bg-background p-3 md:px-6">
        {error && <p role="alert" className="mb-2 text-sm text-destructive">{error}</p>}
        {files.error && <p role="alert" className="text-sm">Attachments could not load. <Button variant="link" onClick={() => void files.refetch()}>Retry</Button></p>}
        {!!allFiles.length && <details className="mb-2 text-sm"><summary className="cursor-pointer">Attached files ({allFiles.length})</summary><ul className="mt-2 flex flex-wrap gap-2">{allFiles.map((file) => <li key={file.id}>
          <Button variant="outline" size="sm" onClick={() => props.onShowFile(file)}><FileText />{file.filename}{draftIds.includes(file.id) ? " · Ready to send" : ""}</Button>
          {!file.messageId && !draftIds.includes(file.id) && <Button variant="ghost" size="sm" disabled={busy || draftIds.length >= MAX_MESSAGE_FILES} onClick={() => setDraftIds((ids) => [...ids, file.id])}>Attach to next message</Button>}
          {draftIds.includes(file.id) && <Button variant="ghost" size="icon" disabled={busy} aria-label={`Remove ${file.filename}`} onClick={async () => {
            try { await practiceApi(`/attachments/${file.id}`, { method: "DELETE" }); setDraftIds((ids) => ids.filter((id) => id !== file.id)); await files.refetch(); }
            catch (failure) { setError(String(failure)); }
          }}><X className="size-3" /></Button>}
        </li>)}</ul></details>}
        {props.thread.archivedAt ? <p className="py-3 text-sm text-muted-foreground">This conversation is archived. Restore it from the conversation menu to continue.</p> : <>
          <div className="mb-3 flex flex-wrap gap-2">{suggestions.slice(0, 4).map((suggestion) => <Button key={suggestion.id} variant="outline" size="sm" disabled={busy || uploading} onClick={() => selectSuggestion(suggestion)}>{suggestion.label}</Button>)}<Button variant="ghost" size="sm" onClick={() => setShowFeatures(true)}>All features</Button></div>
          <form className="flex items-end gap-2" onSubmit={(event) => { event.preventDefault(); void send(input); }}>
            <Input ref={uploadInput} type="file" accept=".txt,.md,.pdf,.docx" multiple className="hidden" tabIndex={-1} onChange={(event) => void upload(event.target.files)} aria-label="Upload documents" />
            <Button type="button" variant="outline" size="icon" disabled={busy || uploading} onClick={() => uploadInput.current?.click()} aria-label="Attach document"><Paperclip /></Button>
            <Textarea aria-label="Message Ghibli agent" placeholder="Ask about films, your files, or your workspace…" value={input} onChange={(event) => setInput(event.target.value)} rows={2} maxLength={20_000} className="max-h-40 min-h-12 resize-none" disabled={!ready || uploading}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(input); } }} />
            {busy ? <Button type="button" variant="outline" size="icon" onClick={() => copilotkit.stopAgent({ agent })} aria-label="Stop response"><Square /></Button> : <Button type="submit" size="icon" disabled={!ready || uploading || !input.trim() && !draftIds.length} aria-label="Send message"><Send /></Button>}
          </form>
          <p className="mt-2 text-xs text-muted-foreground" role="status">{uploading ? "Uploading document…" : busy ? "Ghibli agent is working…" : "Conversations and files are saved on this server. Enter to send · Shift+Enter for a new line."}</p>
        </>}
      </div>
    </div>
    <Dialog open={showFeatures} onOpenChange={setShowFeatures}><DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Try every feature</DialogTitle><DialogDescription>Choose an example to send it to the agent. Attach a file to reveal preview and extraction examples.</DialogDescription></DialogHeader>
      <div className="grid gap-2 sm:grid-cols-2">{suggestions.map((suggestion) => <Button key={suggestion.id} className="h-auto justify-start whitespace-normal text-left" variant="outline" disabled={busy || uploading} onClick={() => selectSuggestion(suggestion)}>{suggestion.label}</Button>)}</div>
    </DialogContent></Dialog>
  </CopilotChatConfigurationProvider>;
}
