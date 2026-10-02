import { z } from "zod";

export const PRACTICE_AGENT_ID = "ghibliAgent";
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_MESSAGE_FILES = 3;
export const EXTRACTION_CHUNK_SIZE = 20_000;
export const idSchema = z.string().uuid();
const optionalQueryBoolean = z.preprocess((value) => {
  if (value === undefined || value === "") return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.boolean().optional());
const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .optional();
export const threadPatchSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    archived: z.boolean().optional(),
    pinned: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "An update is required");
export const listQuerySchema = z
  .object({
    query: z.string().trim().max(200).default(""),
    scope: z.enum(["active", "archived", "all"]).default("active"),
    updatedFrom: optionalDate,
    updatedTo: optionalDate,
    hasAttachments: optionalQueryBoolean,
    page: z.coerce.number().int().min(0).max(10_000).default(0),
  })
  .refine(
    (value) =>
      !value.updatedFrom ||
      !value.updatedTo ||
      value.updatedFrom <= value.updatedTo,
    {
      message: "The start date must not be after the end date",
      path: ["updatedFrom"],
    },
  );

export type ThreadPatch = z.infer<typeof threadPatchSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  pinnedAt: string | null;
  snippet?: string;
};
export type Page<T> = {
  items: T[];
  page: number;
  hasMore: boolean;
  total: number;
};
export type HighlightRange = { start: number; end: number };
export type ConversationSearchResult = Conversation & {
  snippet?: string;
  snippetHighlights?: HighlightRange[];
  matchSource?: "title" | "message";
  matchedMessageId?: string;
  lexicalScore?: number;
  semanticScore?: number;
  score?: number;
  attachmentCount: number;
};
export type ConversationSearchPage = Page<ConversationSearchResult> & {
  searchMode: "browse" | "lexical" | "hybrid";
};
export type Film = {
  id: string;
  title: string;
  description: string;
  image: string;
  releaseYear: string;
};
export type WatchlistItem = Film & { addedAt: string };
export type Attachment = {
  id: string;
  threadId: string;
  messageId: string | null;
  filename: string;
  mediaType: string;
  size: number;
  createdAt: string;
};
export type Extraction = {
  attachmentId: string;
  filename: string;
  text: string;
  offset: number;
  nextOffset: number | null;
  totalCharacters: number;
  pages: { page: number; start: number; end: number }[];
};
