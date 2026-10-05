import { ConversationService } from "./conversations";
import { practiceMemory, PRACTICE_RESOURCE_ID } from "./practice-memory";
import { getPracticeDatabase } from "../repositories/practice-database";
import { WatchlistService } from "./watchlist";
import { AttachmentService } from "./attachments";
import { ConversationSearchService } from "./conversation-search";
import { ConversationTitleService } from "./conversation-title";

export const conversations = new ConversationService(
  practiceMemory,
  PRACTICE_RESOURCE_ID,
);

export const conversationTitles = new ConversationTitleService(conversations);

/** Get the shared persisted watchlist service after additive schema initialization. */
export async function getWatchlist() {
  return new WatchlistService(
    await getPracticeDatabase(),
    PRACTICE_RESOURCE_ID,
  );
}

let attachments: AttachmentService | undefined;
/** Reuse extraction concurrency/cache state while keeping file paths server-owned. */
export async function getAttachments() {
  attachments ??= new AttachmentService(
    await getPracticeDatabase(),
    PRACTICE_RESOURCE_ID,
    process.env.PRACTICE_UPLOAD_DIR || ".practice-uploads",
  );
  return attachments;
}

let conversationSearch: ConversationSearchService | undefined;
/** Share hybrid search indexes across the REST route and the Ghibli agent tool. */
export async function getConversationSearch() {
  conversationSearch ??= new ConversationSearchService(
    await getPracticeDatabase(),
    conversations,
    await getAttachments(),
    PRACTICE_RESOURCE_ID,
  );
  return conversationSearch;
}
