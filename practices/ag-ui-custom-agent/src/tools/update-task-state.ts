export interface TaskState {
  task: string;
  progress: number;
}

export function updateTaskState(
  task: string,
  progress: number,
): TaskState {
  return {
    task,
    progress: Math.min(100, Math.max(0, progress)),
  };
}