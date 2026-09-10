import { NextRequest } from "next/server";
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";

/**
 * Handle POST requests from the CopilotKit frontend runtime.
 *
 * Sets up a CopilotRuntime with an OpenAI adapter using gpt-4o-mini, then
 * delegates to the Next.js App Router endpoint handler. The OPENAI_API_KEY
 * environment variable must be set in .env.local for the adapter to authenticate.
 *
 * Side effects: None beyond the HTTP response; the runtime is created per-request.
 *
 * @param req - The incoming Next.js request, expected to be a POST from CopilotKit.
 * @returns A Response stream from the Copilot runtime.
 */
export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime: new CopilotRuntime(),
    serviceAdapter: new OpenAIAdapter({
      model: "gpt-4o-mini",
    }),
    endpoint: req.nextUrl.pathname,
  });

  return handleRequest(req);
};
