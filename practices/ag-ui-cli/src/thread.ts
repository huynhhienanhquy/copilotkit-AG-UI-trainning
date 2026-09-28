export interface ThreadMemory {
  getThreadById(input: {
    threadId: string;
    resourceId?: string;
  }): Promise<unknown | null>;
  createThread(input: {
    threadId?: string;
    resourceId: string;
    title?: string;
  }): Promise<unknown>;
}

export async function ensureMemoryThread({
  memory,
  threadId,
  resourceId,
}: {
  memory: ThreadMemory;
  threadId: string;
  resourceId: string;
}): Promise<void> {
  const existingThread = await memory.getThreadById({
    threadId,
    resourceId,
  });

  if (existingThread) {
    return;
  }

  await memory.createThread({
    threadId,
    resourceId,
    title: "AG-UI CLI session",
  });
}
