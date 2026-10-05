import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { practiceApi, practiceUrl } from "@/lib/practice/api";
import type {
  Attachment,
  AttachmentPreviewTarget,
  Extraction,
} from "@/lib/practice/contracts";

type Props = {
  file: Attachment;
  target?: AttachmentPreviewTarget;
  onClose: () => void;
};

/** Preview extracted text and focus the exact page/range selected by a citation. */
export function AttachmentPreview({ file, target, onClose }: Props) {
  const initialOffset = Math.max(0, (target?.start ?? 0) - 400);
  const [offset, setOffset] = useState(initialOffset);
  const [focus, setFocus] = useState(target);
  const [original, setOriginal] = useState(
    Boolean(target && file.mediaType === "application/pdf"),
  );
  const highlight = useRef<HTMLElement>(null);
  const result = useQuery({
    queryKey: ["practice", "extraction", file.id, offset],
    retry: false,
    queryFn: ({ signal }) =>
      practiceApi<Extraction>(
        `/attachments/${file.id}/extract?offset=${offset}`,
        { signal },
      ),
  });

  const focusStart = focus
    ? Math.max(0, Math.min(result.data?.text.length ?? 0, focus.start - offset))
    : 0;
  const focusEnd = focus
    ? Math.max(
        focusStart,
        Math.min(result.data?.text.length ?? 0, focus.end - offset),
      )
    : 0;

  useEffect(() => {
    if (result.data && focusEnd > focusStart)
      highlight.current?.scrollIntoView({ block: "center" });
  }, [result.data, focusEnd, focusStart]);

  function navigate(nextOffset: number) {
    setFocus(undefined);
    setOffset(nextOffset);
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{file.filename}</DialogTitle>
          <DialogDescription>
            {Math.ceil(file.size / 1024)} KiB · {file.mediaType}. Preview
            displays extracted text.
            {focus
              ? ` Citation: page ${focus.page}, characters ${focus.start + 1}\u2013${focus.end}.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="w-fit">
            <a href={practiceUrl(`/attachments/${file.id}`)} download>
              Download original
            </a>
          </Button>
          {file.mediaType === "application/pdf" && (
            <Button variant="outline" onClick={() => setOriginal(!original)}>
              {original ? "Hide original PDF" : "Show original PDF"}
            </Button>
          )}
        </div>
        {original && (
          <iframe
            title={`Original PDF: ${file.filename}`}
            src={`${practiceUrl(`/attachments/${file.id}?preview=true`)}${focus ? `#page=${focus.page}` : ""}`}
            sandbox=""
            className="h-[40dvh] w-full rounded border"
          />
        )}
        {result.isPending && <p role="status">Extracting document text…</p>}
        {result.error && (
          <div role="alert">
            <p>{result.error.message}</p>
            <Button onClick={() => void result.refetch()}>
              Retry extraction
            </Button>
          </div>
        )}
        {result.data && (
          <>
            <pre className="max-h-[50dvh] overflow-auto whitespace-pre-wrap rounded border bg-muted/40 p-4 text-sm">
              {focusEnd > focusStart ? (
                <>
                  {result.data.text.slice(0, focusStart)}
                  <mark
                    ref={highlight}
                    className="rounded bg-yellow-200 px-0.5 text-yellow-950 ring-2 ring-yellow-400 dark:bg-yellow-300"
                  >
                    {result.data.text.slice(focusStart, focusEnd)}
                  </mark>
                  {result.data.text.slice(focusEnd)}
                </>
              ) : (
                result.data.text
              )}
            </pre>
            <p className="text-xs text-muted-foreground">
              Characters {offset + 1}–{offset + result.data.text.length} of{" "}
              {result.data.totalCharacters}
              {result.data.pages.length
                ? ` · Pages ${result.data.pages.map((page) => page.page).join(", ")}`
                : ""}
            </p>
            <div className="flex justify-between">
              <Button
                variant="outline"
                disabled={!offset}
                onClick={() => navigate(Math.max(0, offset - 20_000))}
              >
                Previous text
              </Button>
              <Button
                variant="outline"
                disabled={result.data.nextOffset === null}
                onClick={() => navigate(result.data.nextOffset!)}
              >
                More text
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
