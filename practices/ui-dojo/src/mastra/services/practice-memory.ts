import { Memory } from "@mastra/memory";
import { getStorage } from "../storage";

// Server-owned identity for this single-user demo, never supplied by the model.
export const PRACTICE_RESOURCE_ID = process.env.PRACTICE_RESOURCE_ID || "ui-dojo-practice";
export const practiceMemory = new Memory({
  storage: getStorage(),
  options: { generateTitle: false, lastMessages: 40 },
});
