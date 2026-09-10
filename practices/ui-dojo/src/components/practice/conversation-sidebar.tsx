import { useState } from "react";
import { Archive, MoreHorizontal, Pin, Plus, Search, Trash2, Pencil, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Conversation, ThreadPatch } from "@/lib/practice/contracts";
import { cn } from "@/lib/utils";

type Props = {
  threads: Conversation[]; activeId?: string; scope: "active" | "archived"; loading: boolean; error?: string;
  busy: boolean; hasMore: boolean; onMore: () => void; onCreate: () => void; onSelect: (id: string) => void;
  onScope: (scope: "active" | "archived") => void; onSearch: () => void; onRetry: () => void;
  onUpdate: (id: string, patch: ThreadPatch) => Promise<void>; onDelete: (thread: Conversation) => void;
};

/** Render the durable thread list and accessible controls; mutations are owned by the parent service. */
export function ConversationSidebar(props: Props) {
  const [renaming, setRenaming] = useState<Conversation | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  return <nav aria-label="Conversations" className="flex h-full flex-col gap-3 p-3">
    <div className="flex gap-2"><Button className="flex-1" onClick={props.onCreate} disabled={props.busy}><Plus />New chat</Button>
      <Button variant="outline" size="icon" onClick={props.onSearch} aria-label="Search conversations"><Search /></Button></div>
    <div className="flex gap-1" aria-label="Conversation filter">
      <Button size="sm" variant={props.scope === "active" ? "secondary" : "ghost"} onClick={() => props.onScope("active")}>Active</Button>
      <Button size="sm" variant={props.scope === "archived" ? "secondary" : "ghost"} onClick={() => props.onScope("archived")}><Archive className="size-3" />Archived</Button>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto">
      {props.loading && <p role="status" className="p-3 text-sm text-muted-foreground">Loading conversations…</p>}
      {props.error && <div role="alert"><p>{props.error}</p><Button variant="outline" onClick={props.onRetry}>Retry</Button></div>}
      {!props.loading && !props.error && !props.threads.length && <p className="p-3 text-sm text-muted-foreground">No {props.scope} conversations yet.</p>}
      <ul className="space-y-1">{props.threads.map((thread) => <li key={thread.id} className={cn("flex items-center rounded-lg", thread.id === props.activeId && "bg-accent")}>
        <Button variant="ghost" className="min-w-0 flex-1 justify-start" aria-current={thread.id === props.activeId ? "page" : undefined} onClick={() => props.onSelect(thread.id)}>
          {thread.pinnedAt && <Pin className="size-3 shrink-0" aria-label="Pinned" />}<span className="truncate">{thread.title}</span>
        </Button>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={props.busy} aria-label={`Actions for ${thread.title}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => { setRenaming(thread); setTitle(thread.title); setError(""); }}><Pencil />Rename</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void props.onUpdate(thread.id, { pinned: !thread.pinnedAt }).catch(() => undefined)}><Pin />{thread.pinnedAt ? "Unpin" : "Pin"}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void props.onUpdate(thread.id, { archived: !thread.archivedAt }).catch(() => undefined)}>{thread.archivedAt ? <ArchiveRestore /> : <Archive />}{thread.archivedAt ? "Restore" : "Archive"}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => props.onDelete(thread)}><Trash2 />Delete</DropdownMenuItem>
          </DropdownMenuContent></DropdownMenu>
      </li>)}</ul>
      {props.hasMore && <Button variant="ghost" className="w-full" onClick={props.onMore}>Load more conversations</Button>}
    </div>
    <p className="text-xs text-muted-foreground">Ghibli Practice · saved on this server</p>
    <Dialog open={!!renaming} onOpenChange={(open) => { if (!open) setRenaming(null); }}><DialogContent>
      <DialogHeader><DialogTitle>Rename conversation</DialogTitle><DialogDescription>Choose a title up to 120 characters.</DialogDescription></DialogHeader>
      <form className="space-y-3" onSubmit={async (event) => { event.preventDefault(); if (!renaming) return;
        try { await props.onUpdate(renaming.id, { title: title.trim() }); setRenaming(null); } catch (failure) { setError(String(failure)); } }}>
        <Input aria-label="Conversation title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required />
        {error && <p role="alert">{error}</p>}<Button type="submit" disabled={!title.trim() || props.busy}>Save title</Button>
      </form>
    </DialogContent></Dialog>
  </nav>;
}
