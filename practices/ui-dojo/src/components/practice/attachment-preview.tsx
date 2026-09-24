import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { practiceApi, practiceUrl } from "@/lib/practice/api";
import type { Attachment, Extraction } from "@/lib/practice/contracts";

/** Preview readable text with page/chunk provenance and an original-file download link. */
export function AttachmentPreview({ file, onClose }: { file: Attachment; onClose: () => void }) {
  const [offset, setOffset] = useState(0);
  const [original, setOriginal] = useState(false);
  const result = useQuery({ queryKey: ["practice", "extraction", file.id, offset], retry: false,
    queryFn: ({ signal }) => practiceApi<Extraction>(`/attachments/${file.id}/extract?offset=${offset}`, { signal }) });
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="sm:max-w-3xl">
    <DialogHeader><DialogTitle>{file.filename}</DialogTitle><DialogDescription>{Math.ceil(file.size / 1024)} KiB · {file.mediaType}. Preview displays extracted text.</DialogDescription></DialogHeader>
    <Button asChild variant="outline" className="w-fit"><a href={practiceUrl(`/attachments/${file.id}`)} download>Download original</a></Button>
    {file.mediaType === "application/pdf" && <Button variant="outline" onClick={() => setOriginal(!original)}>{original ? "Hide original PDF" : "Show original PDF"}</Button>}
    {original && <iframe title={`Original PDF: ${file.filename}`} src={practiceUrl(`/attachments/${file.id}?preview=true`)} sandbox="" className="h-[40dvh] w-full rounded border" />}
    {result.isPending && <p role="status">Extracting document text…</p>}
    {result.error && <div role="alert"><p>{result.error.message}</p><Button onClick={() => void result.refetch()}>Retry extraction</Button></div>}
    {result.data && <>
      <pre className="max-h-[50dvh] overflow-auto whitespace-pre-wrap rounded border bg-muted/40 p-4 text-sm">{result.data.text}</pre>
      <p className="text-xs text-muted-foreground">Characters {offset + 1}–{offset + result.data.text.length} of {result.data.totalCharacters}{result.data.pages.length ? ` · Pages ${result.data.pages.map((page) => page.page).join(", ")}` : ""}</p>
      <div className="flex justify-between"><Button variant="outline" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 20_000))}>Previous text</Button>
        <Button variant="outline" disabled={result.data.nextOffset === null} onClick={() => setOffset(result.data.nextOffset!)}>More text</Button></div>
    </>}
  </DialogContent></Dialog>;
}
