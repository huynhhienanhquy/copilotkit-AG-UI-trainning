import { InMemoryAgentRunner, type AgentRunnerRunRequest } from "@copilotkit/runtime/v2";

const runningControllers = new Map<string, AbortController>();

/** Release a thread lease only when the actual cloned agent finishes, even after HTTP disconnect. */
export class PracticeRunner extends InMemoryAgentRunner {
  started = false;
  private readonly finish: () => void;
  readonly controller = new AbortController();

  /** Supply an idempotent completion callback for this request's thread lease. */
  constructor(finish: () => void) { super(); this.finish = finish; }

  /** Observe the runtime's actual agent clone, not the template returned by getLocalAgent. */
  override run(request: AgentRunnerRunRequest) {
    this.started = true;
    runningControllers.set(request.threadId, this.controller);
    const timer = setTimeout(() => { void this.stop({ threadId: request.threadId }); }, 120_000);
    const subscription = request.agent.subscribe({ onRunFinalized: () => {
      if (runningControllers.get(request.threadId) === this.controller) runningControllers.delete(request.threadId);
      clearTimeout(timer); this.finish(); subscription.unsubscribe();
    } });
    try { return super.run(request); }
    catch (error) { runningControllers.delete(request.threadId); clearTimeout(timer); subscription.unsubscribe(); this.finish(); throw error; }
  }

  /** Abort Mastra's provider request; keep observing until its finalizer has finished saving. */
  override stop({ threadId }: { threadId: string }): Promise<boolean> {
    const controller = runningControllers.get(threadId);
    if (!controller || controller.signal.aborted) return Promise.resolve(false);
    controller.abort();
    return Promise.resolve(true);
  }
}
