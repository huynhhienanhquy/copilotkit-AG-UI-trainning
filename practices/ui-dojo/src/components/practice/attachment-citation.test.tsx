// @vitest-environment jsdom

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { practiceApi } from "@/lib/practice/api";
import { citationMarker } from "@/lib/practice/citations";
import type {
  Attachment,
  AttachmentPreviewTarget,
} from "@/lib/practice/contracts";
import {
  AttachmentCitationMarkdown,
  AttachmentCitationProvider,
} from "./attachment-citation";
import { AttachmentPreview } from "./attachment-preview";

// CopilotKit's entry point imports CSS in Node. Its MarkdownRenderer delegates
// directly to Streamdown, so exercise that same renderer without the CSS entry.
vi.mock("@copilotkit/react-core/v2", async () => {
  const { Streamdown } = await import("streamdown");
  return {
    CopilotChatAssistantMessage: {
      MarkdownRenderer: ({
        content,
        ...props
      }: Omit<React.ComponentProps<typeof Streamdown>, "children"> & {
        content: string;
      }) => <Streamdown {...props}>{content}</Streamdown>,
    },
  };
});

vi.mock("@/lib/practice/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/practice/api")>()),
  practiceApi: vi.fn(),
}));

const firstFile: Attachment = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  threadId: "123e4567-e89b-42d3-a456-426614174001",
  messageId: null,
  filename: "first.pdf",
  mediaType: "application/pdf",
  size: 100,
  createdAt: "2026-10-11T00:00:00.000Z",
};
const sourceFile: Attachment = {
  ...firstFile,
  id: "123e4567-e89b-42d3-a456-426614174002",
  filename: "notes\\[final] _draft_ <review>.pdf",
};
const sourceText = `${"Earlier pages. ".repeat(1_650)}Totoro arrives at noon. Bring lunch.`;
const sourceStart = sourceText.indexOf("Totoro arrives");
const target = { page: 3, start: sourceStart, end: sourceStart + 22 };

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  vi.mocked(practiceApi).mockImplementation(async (path) => {
    const offset = Number(
      new URL(path, "http://localhost").searchParams.get("offset"),
    );
    return {
      attachmentId: sourceFile.id,
      filename: sourceFile.filename,
      text: sourceText.slice(offset, offset + 20_000),
      offset,
      nextOffset: null,
      totalCharacters: sourceText.length,
      pages: [{ page: 3, start: sourceStart, end: sourceText.length }],
      chunks: [],
    };
  });
});
afterEach(cleanup);

function withQueries(children: React.ReactNode) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
      }
    >
      {children}
    </QueryClientProvider>
  );
}

it("renders a literal filename and opens the exact referenced file, page and character range", async () => {
  const onOpen = vi.fn();
  render(
    <AttachmentCitationProvider files={[firstFile, sourceFile]} onOpen={onOpen}>
      <AttachmentCitationMarkdown
        content={`Meeting time ${citationMarker({ attachmentId: sourceFile.id, ...target })}.`}
      />
    </AttachmentCitationProvider>,
  );

  const citation = await screen.findByRole("button", {
    name: `${sourceFile.filename} · p. 3`,
  });
  fireEvent.click(citation);
  expect(onOpen).toHaveBeenCalledExactlyOnceWith(sourceFile, target);
});

function CitationWithPreview() {
  const [preview, setPreview] = useState<{
    file: Attachment;
    target: AttachmentPreviewTarget;
  }>();
  return (
    <>
      <AttachmentCitationProvider
        files={[firstFile, sourceFile]}
        onOpen={(file, range) => setPreview({ file, target: range })}
      >
        <AttachmentCitationMarkdown
          content={`Meeting time ${citationMarker({ attachmentId: sourceFile.id, ...target })}.`}
        />
      </AttachmentCitationProvider>
      {preview && (
        <AttachmentPreview
          file={preview.file}
          target={preview.target}
          onClose={() => setPreview(undefined)}
        />
      )}
    </>
  );
}

it("a response citation loads the later document segment, highlights the exact text and focuses the original PDF page", async () => {
  render(withQueries(<CitationWithPreview />));
  fireEvent.click(
    await screen.findByRole("button", {
      name: `${sourceFile.filename} · p. 3`,
    }),
  );
  await waitFor(() =>
    expect(document.querySelector("mark")?.textContent).toBe(
      sourceText.slice(target.start, target.end),
    ),
  );
  expect(practiceApi).toHaveBeenCalledWith(
    `/attachments/${sourceFile.id}/extract?offset=${sourceStart - 400}`,
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(
    screen.getByRole("heading", { name: sourceFile.filename }),
  ).toBeTruthy();
  expect(
    screen
      .getByTitle(`Original PDF: ${sourceFile.filename}`)
      .getAttribute("src"),
  ).toContain(`/attachments/${sourceFile.id}?preview=true#page=3`);
  expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
});

it("updates the focused range when another citation has the same file and start offset", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity } },
  });
  const preview = (range: AttachmentPreviewTarget) => (
    <QueryClientProvider client={client}>
      <AttachmentPreview
        file={sourceFile}
        target={range}
        onClose={() => undefined}
      />
    </QueryClientProvider>
  );
  const view = render(preview(target));
  await waitFor(() =>
    expect(document.querySelector("mark")?.textContent).toBe(
      sourceText.slice(target.start, target.end),
    ),
  );
  const next = { ...target, page: 4, end: sourceText.length };
  view.rerender(preview(next));
  await waitFor(() =>
    expect(document.querySelector("mark")?.textContent).toBe(
      sourceText.slice(next.start, next.end),
    ),
  );
  expect(
    screen
      .getByTitle(`Original PDF: ${sourceFile.filename}`)
      .getAttribute("src"),
  ).toContain("#page=4");
});

it("keeps a deleted or unknown source unavailable instead of opening a different file", async () => {
  const onOpen = vi.fn();
  render(
    <AttachmentCitationProvider files={[firstFile]} onOpen={onOpen}>
      <AttachmentCitationMarkdown
        content={citationMarker({ attachmentId: sourceFile.id, ...target })}
      />
    </AttachmentCitationProvider>,
  );
  expect(await screen.findByText("[source unavailable]")).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
  expect(onOpen).not.toHaveBeenCalled();
  expect(practiceApi).not.toHaveBeenCalled();
});
