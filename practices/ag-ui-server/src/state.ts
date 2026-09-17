import { randomUUID } from "node:crypto";

export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  updatedAt: string;
}

export interface WorkspaceState {
  tasks: Task[];
  focus: string;
  lastUpdated: string;
}

export type ToolRequest =
  | { name: "upsert_task"; arguments: { id?: string; title: string; status?: TaskStatus } }
  | { name: "set_focus"; arguments: { focus: string } }
  | { name: "clear_completed"; arguments: Record<string, never> };

export const createInitialState = (): WorkspaceState => ({
  tasks: [],
  focus: "No focus selected",
  lastUpdated: new Date().toISOString(),
});

export class WorkspaceStore {
  private readonly workspaces = new Map<string, WorkspaceState>();

  get(threadId: string, seed?: unknown): WorkspaceState {
    const existing = this.workspaces.get(threadId);
    if (existing) return existing;

    const initial = isWorkspaceState(seed) ? cloneState(seed) : createInitialState();
    this.workspaces.set(threadId, initial);
    return initial;
  }

  execute(threadId: string, request: ToolRequest): { message: string; state: WorkspaceState } {
    const state = this.get(threadId);
    const now = new Date().toISOString();

    if (request.name === "upsert_task") {
      const title = request.arguments.title.trim();
      if (!title) throw new Error("Task title cannot be empty.");

      const task = request.arguments.id
        ? state.tasks.find((item) => item.id === request.arguments.id)
        : state.tasks.find((item) => item.title.toLocaleLowerCase() === title.toLocaleLowerCase());

      if (task) {
        task.title = title;
        task.status = request.arguments.status ?? task.status;
        task.updatedAt = now;
      } else {
        state.tasks.push({
          id: request.arguments.id ?? randomUUID(),
          title,
          status: request.arguments.status ?? "todo",
          updatedAt: now,
        });
      }

      state.lastUpdated = now;
      return {
        message: `${task ? "Updated" : "Created"} task “${title}”.`,
        state: cloneState(state),
      };
    }

    if (request.name === "set_focus") {
      state.focus = request.arguments.focus.trim() || "No focus selected";
      state.lastUpdated = now;
      return { message: `Current focus: “${state.focus}”.`, state: cloneState(state) };
    }

    const before = state.tasks.length;
    state.tasks = state.tasks.filter((task) => task.status !== "done");
    state.lastUpdated = now;
    return {
      message: `Removed ${before - state.tasks.length} completed task(s).`,
      state: cloneState(state),
    };
  }
}

function isWorkspaceState(value: unknown): value is WorkspaceState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<WorkspaceState>;
  return Array.isArray(candidate.tasks) && typeof candidate.focus === "string";
}

function cloneState(state: WorkspaceState): WorkspaceState {
  return structuredClone(state);
}
