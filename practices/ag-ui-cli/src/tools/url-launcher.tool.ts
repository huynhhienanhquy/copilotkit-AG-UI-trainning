import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import open from "open";

export const urlLauncherTool = createTool({
  id: "url-launcher",

  description:
    "Open a URL in the user's default web browser when the user asks to open or launch a website.",

  inputSchema: z.object({
    url: z.string().url(),
  }),

  execute: async ({ url }) => {
    await open(url);

    return {
      success: true,
      url,
    };
  },
});