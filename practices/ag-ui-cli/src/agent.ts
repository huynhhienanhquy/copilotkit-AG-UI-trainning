import { Agent } from "@mastra/core/agent";
import { MastraAgent } from "@ag-ui/mastra";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";

import { weatherTool } from "./tools/weather.tool";
import { browserTool } from "./tools/browser.tool";
import { calculatorTool } from "./tools/calculator.tool";
import { urlLauncherTool } from "./tools/url-launcher.tool";

export const memory = new Memory({
  storage: new LibSQLStore({
    id: "mastra-cli-example-db",
    url: "file:./mastra.db",
  }),
});

export const resourceId = "cliExample";

export const agent = new MastraAgent({
  resourceId,

  agent: new Agent({
    id: "ag-ui-agent",
    name: "AG-UI Agent",

    instructions: `
      You are a helpful assistant that runs in a CLI application.

      Use weatherTool for weather information.
      Use browserTool to browse websites.
      Use calculatorTool for mathematical calculations.
      Use urlLauncherTool when the user asks to open a URL.
    `,

    model: "openai/gpt-4.1-mini",

    tools: {
      weatherTool,
      browserTool,
      calculatorTool,
      urlLauncherTool,
    },

    memory,
  }),
});