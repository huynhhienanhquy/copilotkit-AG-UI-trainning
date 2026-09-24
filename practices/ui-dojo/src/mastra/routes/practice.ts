import { registerApiRoute } from "@mastra/core/server";
import { RequestContext, MASTRA_RESOURCE_ID_KEY, MASTRA_THREAD_ID_KEY } from "@mastra/core/request-context";
import { CopilotRuntime, createCopilotRuntimeHandler } from "@copilotkit/runtime/v2";
import { getLocalAgent } from "@ag-ui/mastra";
import { RunAgentInputSchema } from "@ag-ui/core";
import { z } from "zod";
import { idSchema, listQuerySchema, threadPatchSchema, PRACTICE_AGENT_ID } from "../../lib/practice/contracts";
import { conversations, getWatchlist, getAttachments } from "../services/practice";
import { PRACTICE_RESOURCE_ID } from "../services/practice-memory";
import { PracticeError } from "../services/practice-errors";
import { restoreMessages } from "../services/practice-messages";
import { getFilmCatalog } from "../services/watchlist";
import { PracticeRunner } from "../services/practice-runner";
import { boundedRequest } from "../services/request-body";
import { currentTurnMessages } from "../../lib/practice/run-messages";

/** Serialize API data with no-cache semantics; persistence belongs to the database. */
function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

/** Map validation/domain errors at the transport boundary without exposing internal details. */
export async function practiceBoundary(operation: () => Promise<Response>): Promise<Response> {
  try { return await operation(); }
  catch (error) {
    if (error instanceof z.ZodError) return json({ code: "validation", message: "Invalid request", details: error.issues.map(({ path, message }) => ({ path, message })) }, 400);
    if (error instanceof SyntaxError) return json({ code: "validation", message: "Invalid JSON request" }, 400);
    if (error instanceof PracticeError) return json({ code: error.code, message: error.message }, error.status);
    const requestId = crypto.randomUUID();
    console.error(JSON.stringify({ event: "practice_request_failed", requestId, errorType: error instanceof Error ? error.name : "UnknownError" }));
    return json({ code: "internal_error", message: "The request could not be completed. Please try again.", requestId }, 500);
  }
}

const runtimePath = "/practice/copilotkit";
const envelopeSchema = z.object({
  method: z.enum(["info", "agent/run", "agent/connect", "agent/stop"]),
  params: z.object({ agentId: z.literal(PRACTICE_AGENT_ID), threadId: idSchema.optional() }).optional(),
  body: z.unknown().optional(),
});

export const practiceRoutes = [
  registerApiRoute("/practice/threads", { method: "GET", handler: (c) => practiceBoundary(async () =>
    json(await conversations.list(listQuerySchema.parse(c.req.query())))) }),
  registerApiRoute("/practice/threads", { method: "POST", handler: () => practiceBoundary(async () => json(await conversations.create(), 201)) }),
  registerApiRoute("/practice/threads/:id", { method: "GET", handler: (c) => practiceBoundary(async () =>
    json(await conversations.get(idSchema.parse(c.req.param("id"))))) }),
  registerApiRoute("/practice/threads/:id", { method: "PATCH", handler: (c) => practiceBoundary(async () =>
    json(await conversations.update(idSchema.parse(c.req.param("id")), threadPatchSchema.parse(await c.req.json())))) }),
  registerApiRoute("/practice/threads/:id", { method: "DELETE", handler: (c) => practiceBoundary(async () => {
    const id = idSchema.parse(c.req.param("id"));
    await conversations.delete(id, async () => (await getAttachments()).deleteThread(id));
    return new Response(null, { status: 204 });
  }) }),
  registerApiRoute("/practice/threads/:id/messages", { method: "GET", handler: (c) => practiceBoundary(async () => {
    const page = z.coerce.number().int().min(0).max(10_000).parse(c.req.query("page") || 0);
    const result = await conversations.messages(idSchema.parse(c.req.param("id")), page, "DESC");
    return json({ items: restoreMessages(result.messages), page, total: result.total, hasMore: result.hasMore });
  }) }),
  registerApiRoute("/practice/threads/:id/messages", { method: "POST", handler: (c) => practiceBoundary(async () => {
    const threadId = idSchema.parse(c.req.param("id"));
    const input = z.object({ id: idSchema, text: z.string().trim().max(20_000), attachmentIds: z.array(idSchema).max(3) }).parse(await c.req.json());
    if (!input.text && !input.attachmentIds.length) throw new PracticeError("empty_message", "Enter a message or attach a document");
    return conversations.writeToThread(threadId, async () => {
      const attachments = await getAttachments();
      const files = await attachments.validateBinding(threadId, input.id, input.attachmentIds);
      const references = files.length ? `\n\nAttached files:\n${files.map((file) => `${file.filename} (attachment ID: ${file.id})`).join("\n")}` : "";
      const content = (input.text || "Please read the attached document.") + references;
      await conversations.saveUserMessage(threadId, input.id, content);
      await attachments.bind(threadId, input.id, input.attachmentIds);
      return json({ id: input.id, role: "user", content }, 201);
    });
  }) }),
  registerApiRoute("/practice/films", { method: "GET", handler: () => practiceBoundary(async () => json(await getFilmCatalog())) }),
  registerApiRoute("/practice/threads/:id/attachments", { method: "GET", handler: (c) => practiceBoundary(async () => {
    const id = idSchema.parse(c.req.param("id")); await conversations.requireThread(id);
    return json(await (await getAttachments()).list(id));
  }) }),
  registerApiRoute("/practice/threads/:id/attachments", { method: "POST", handler: (c) => practiceBoundary(async () => {
    const id = idSchema.parse(c.req.param("id")); await conversations.requireThread(id);
    const data = await (await boundedRequest(c.req.raw, 10 * 1024 * 1024 + 100_000)).formData();
    const file = data.get("file");
    if (!(file instanceof File)) throw new PracticeError("invalid_file", "A file is required");
    const attachments = await getAttachments();
    await attachments.cleanupDrafts();
    return conversations.writeToThread(id, async () => json(await attachments.upload(id, file.name, Buffer.from(await file.arrayBuffer())), 201));
  }) }),
  registerApiRoute("/practice/threads/:id/attachments/bind", { method: "POST", handler: (c) => practiceBoundary(async () => {
    const id = idSchema.parse(c.req.param("id")); await conversations.requireThread(id);
    const body = z.object({ messageId: idSchema, attachmentIds: z.array(idSchema).max(3) }).parse(await c.req.json());
    return conversations.writeToThread(id, async () => json(await (await getAttachments()).bind(id, body.messageId, body.attachmentIds)));
  }) }),
  registerApiRoute("/practice/attachments/:id", { method: "GET", handler: (c) => practiceBoundary(async () => {
    const { attachment, buffer } = await (await getAttachments()).read(idSchema.parse(c.req.param("id")));
    return new Response(new Uint8Array(buffer), { headers: { "Content-Type": attachment.mediaType,
      "Content-Disposition": `${c.req.query("preview") === "true" && attachment.mediaType === "application/pdf" ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
      "Content-Security-Policy": "sandbox",
      "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } });
  }) }),
  registerApiRoute("/practice/attachments/:id", { method: "DELETE", handler: (c) => practiceBoundary(async () => {
    await (await getAttachments()).remove(idSchema.parse(c.req.param("id"))); return new Response(null, { status: 204 });
  }) }),
  registerApiRoute("/practice/attachments/:id/extract", { method: "GET", handler: (c) => practiceBoundary(async () =>
    json(await (await getAttachments()).extract(idSchema.parse(c.req.param("id")), z.coerce.number().int().min(0).parse(c.req.query("offset") || 0)))) }),
  registerApiRoute("/practice/watchlist", { method: "GET", handler: () => practiceBoundary(async () => json(await (await getWatchlist()).list())) }),
  registerApiRoute("/practice/watchlist/:id", { method: "PUT", handler: (c) => practiceBoundary(async () => json(await (await getWatchlist()).add(idSchema.parse(c.req.param("id"))))) }),
  registerApiRoute("/practice/watchlist/:id", { method: "DELETE", handler: (c) => practiceBoundary(async () => json(await (await getWatchlist()).remove(idSchema.parse(c.req.param("id"))))) }),
  registerApiRoute(runtimePath, { method: "ALL", handler: (c) => practiceBoundary(async () => {
    if (c.req.method !== "POST") return json({ code: "method_not_allowed", message: "Use POST" }, 405);
    const request = await boundedRequest(c.req.raw, 2_500_000);
    const envelope = envelopeSchema.parse(await request.clone().json());
    const context = new RequestContext();
    context.set(MASTRA_RESOURCE_ID_KEY, PRACTICE_RESOURCE_ID);
    let release: (() => void) | undefined;
    if (envelope.method === "agent/run") {
      const input = RunAgentInputSchema.parse(envelope.body);
      idSchema.parse(input.threadId);
      if (input.messages.length > 200 || JSON.stringify(input).length > 2_000_000) throw new PracticeError("too_large", "This request is too large", 413);
      const messages = currentTurnMessages(input.messages);
      if (!messages.length) throw new PracticeError("empty_turn", "A user message is required");
      if (input.resume?.length || input.forwardedProps?.command) throw new PracticeError("unsupported_resume", "This practice does not accept workflow resume commands");
      const frontendTools = new Set(["set_theme", "set_conversation_sidebar", "open_conversation_search", "show_attachment", "delete_conversation"]);
      envelope.body = { ...input, messages, state: {}, forwardedProps: {}, tools: input.tools.filter((tool) => frontendTools.has(tool.name)) };
      context.set(MASTRA_THREAD_ID_KEY, input.threadId);
      release = await conversations.beginRun(input.threadId);
    } else if (envelope.method === "agent/stop") {
      await conversations.requireThread(idSchema.parse(envelope.params?.threadId));
    } else if (envelope.method === "agent/connect") {
      const input = z.object({ threadId: idSchema }).parse(envelope.body);
      await conversations.requireThread(input.threadId);
    }
    let detachAbort = () => {};
    const finish = () => { release?.(); detachAbort(); };
    const runner = new PracticeRunner(finish);
    context.set("practiceAbortSignal", runner.controller.signal);
    try {
      const agent = getLocalAgent({ mastra: c.get("mastra"), agentId: PRACTICE_AGENT_ID, resourceId: PRACTICE_RESOURCE_ID, requestContext: context });
      const runtime = new CopilotRuntime({ agents: { [PRACTICE_AGENT_ID]: agent }, runner });
      if (release) {
        const stop = () => { runner.controller.abort(); };
        c.req.raw.signal.addEventListener("abort", stop);
        detachAbort = () => c.req.raw.signal.removeEventListener("abort", stop);
      }
      const handler = createCopilotRuntimeHandler({ runtime, basePath: runtimePath, mode: "single-route" });
      const response = await handler(new Request(request.url, { method: "POST", headers: request.headers, body: JSON.stringify(envelope) }));
      if (!runner.started) finish();
      if (!release || !response.body) return response;
      const reader = response.body.getReader();
      return new Response(new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            const chunk = await reader.read();
            if (chunk.done) controller.close();
            else controller.enqueue(chunk.value);
          } catch (error) { controller.error(error); }
        },
        async cancel() {
          const body = z.object({ threadId: idSchema }).parse(envelope.body);
          await runtime.runner.stop({ threadId: body.threadId }); await reader.cancel();
        },
      }), { status: response.status, headers: response.headers });
    } catch (error) { if (!runner.started) finish(); throw error; }
  }) }),
];
