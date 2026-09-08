export interface Todo {
  id: string;
  text: string;
  isCompleted: boolean;
  assignedTo?: string;
}

export type TodoPatch = Partial<Pick<Todo, "text" | "isCompleted" | "assignedTo">>;
export type TodoResult =
  | { ok: true; message: string }
  | { ok: false; code: "INVALID_INPUT" | "NOT_FOUND"; message: string };
