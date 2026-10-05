import OpenAI from "openai";
import { DEFAULT_CONVERSATION_TITLE } from "../../lib/practice/contracts";
import type { ConversationService } from "./conversations";

export type ConversationTitleProvider = (
  message: string,
  model: string,
) => Promise<string>;

const MAX_TITLE_CHARACTERS = 80;
const MAX_TITLE_INPUT_CHARACTERS = 2_000;
const MAX_TITLE_OUTPUT_TOKENS = 256;

function titleGenerationControls(model: string) {
  return /^gpt-[56](?:[.-]|$)/i.test(model)
    ? {
        reasoning: { effort: "low" as const },
      }
    : {};
}

/** Generate one short title with a bounded server-side OpenAI request. */
async function openAIConversationTitle(
  message: string,
  model: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    timeout: 8_000,
    maxRetries: 0,
  });
  const response = await client.responses.create({
    model,
    ...titleGenerationControls(model),
    instructions:
      "Create a concise conversation title of 3 to 7 words. Preserve the user's language. Return only the title, without quotes, markdown, labels, or ending punctuation.",
    input: message.slice(0, MAX_TITLE_INPUT_CHARACTERS),
    max_output_tokens: MAX_TITLE_OUTPUT_TOKENS,
    store: false,
  });
  if (!response.output_text) {
    const error = new Error(
      `Title provider returned no text (${response.incomplete_details?.reason || response.status})`,
    );
    error.name = "TitleProviderEmptyOutputError";
    throw error;
  }
  return response.output_text;
}

/** Normalize model output to a single safe, bounded plain-text title. */
export function normalizeConversationTitle(value: string): string {
  const firstLine = value
    .normalize("NFKC")
    .split(/\r?\n/, 1)[0]
    .replace(/^\s*(?:#{1,6}\s*)?(?:title\s*:\s*)?/i, "")
    .replace(/^["'`“”‘’]+|["'`“”‘’]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?。！？]+$/u, "")
    .trim();
  return Array.from(firstLine).slice(0, MAX_TITLE_CHARACTERS).join("").trim();
}

/** Generate for a default-titled conversation, then atomically compare-and-set. */
export class ConversationTitleService {
  private readonly conversations: ConversationService;
  private readonly provider: ConversationTitleProvider;
  private readonly model: string;

  constructor(
    conversations: ConversationService,
    provider: ConversationTitleProvider = openAIConversationTitle,
    model = process.env.PRACTICE_TITLE_MODEL || "gpt-5-mini",
  ) {
    this.conversations = conversations;
    this.provider = provider;
    this.model = model;
  }

  async generateIfDefault(threadId: string, message: string) {
    const current = await this.conversations.get(threadId);
    if (current.title !== DEFAULT_CONVERSATION_TITLE) return null;
    try {
      const title = normalizeConversationTitle(
        await this.provider(message, this.model),
      );
      if (!title || title === DEFAULT_CONVERSATION_TITLE) return null;
      return this.conversations.updateTitleIfDefault(threadId, title);
    } catch (error) {
      console.warn(
        JSON.stringify({
          event: "practice_title_generation_failed",
          errorType: error instanceof Error ? error.name : "UnknownError",
        }),
      );
      return null;
    }
  }
}
