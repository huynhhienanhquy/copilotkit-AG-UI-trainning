import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { weatherTool } from "@/mastra/tools/weather-tool";
import { z } from "zod";

export const AgentState = z.object({
  status: z
    .enum(["idle", "loading", "success", "error"])
    .default("idle"),

  weather: z
    .object({
      temperature: z.number(),
      feelsLike: z.number(),
      humidity: z.number(),
      windSpeed: z.number(),
      windGust: z.number(),
      conditions: z.string(),
      location: z.string(),
    })
    .optional(),
});

export const weatherAgent = new Agent({
  id: "weather-agent",

  name: "Weather Agent",

  tools: {
    weatherTool,
  },

  model: openai("gpt-4o"),

  instructions: `
    You are a weather assistant.

    When the user asks about weather:

    1. Identify the location.
    2. Ask the user for confirmation before retrieving weather data.
    3. If the user approves, call weatherTool.
    4. If the user rejects, do not call weatherTool.
    5. After getting the weather data, provide a short summary.

    Always use weatherTool for current weather information.
  `,
});