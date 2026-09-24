export type AgentStatus =
  | "idle"
  | "thinking"
  | "working"
  | "completed";

export interface AgentState {
  status: AgentStatus;
  progress: number;
  task: string | null;
  result: string | null;
}

export const initialState: AgentState = {
  status: "idle",
  progress: 0,
  task: null,
  result: null,
};