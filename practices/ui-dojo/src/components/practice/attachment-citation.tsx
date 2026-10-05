import {
  createContext,
  useContext,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import { CopilotChatAssistantMessage } from "@copilotkit/react-core/v2";
import { FileText } from "lucide-react";
import type {
  Attachment,
  AttachmentPreviewTarget,
} from "@/lib/practice/contracts";
import {
  citationFromHref,
  citationMarkersToMarkdown,
} from "@/lib/practice/citations";
import { cn } from "@/lib/utils";

type CitationContextValue = {
  files: Attachment[];
  onOpen: (file: Attachment, target: AttachmentPreviewTarget) => void;
};

const CitationContext = createContext<CitationContextValue | null>(null);

export function AttachmentCitationProvider({
  files,
  onOpen,
  children,
}: CitationContextValue & { children: ReactNode }) {
  return (
    <CitationContext.Provider value={{ files, onOpen }}>
      {children}
    </CitationContext.Provider>
  );
}

function CitationAnchor({
  href,
  className,
  children,
  node,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown }) {
  void node;
  const context = useContext(CitationContext);
  const citation = citationFromHref(href);
  if (!citation || !context)
    return (
      <a href={href} className={className} {...props}>
        {children}
      </a>
    );
  const file = context.files.find(
    (candidate) => candidate.id.toLowerCase() === citation.attachmentId,
  );
  if (!file)
    return (
      <span className="text-muted-foreground" title="Source unavailable">
        {children}
      </span>
    );
  return (
    <button
      type="button"
      className={cn(
        "mx-0.5 inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 align-baseline text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      title={`Open ${file.filename}, page ${citation.page}, characters ${citation.start + 1}\u2013${citation.end}`}
      onClick={() =>
        context.onOpen(file, {
          page: citation.page,
          start: citation.start,
          end: citation.end,
        })
      }
    >
      <FileText className="size-3" aria-hidden />
      {children}
    </button>
  );
}

/** Render exact source markers as inline buttons without trusting arbitrary URLs. */
export function AttachmentCitationMarkdown({
  content,
  components,
  ...props
}: React.ComponentProps<typeof CopilotChatAssistantMessage.MarkdownRenderer>) {
  const context = useContext(CitationContext);
  const markdown = citationMarkersToMarkdown(
    content,
    (attachmentId) =>
      context?.files.find(
        (file) => file.id.toLowerCase() === attachmentId.toLowerCase(),
      )?.filename,
  );
  return (
    <CopilotChatAssistantMessage.MarkdownRenderer
      {...props}
      content={markdown}
      components={{ ...components, a: CitationAnchor }}
    />
  );
}
