const queues = new WeakMap<object, Map<string, Promise<void>>>();

/** Serialize snapshots as well as requests, so a rollback cannot erase another write. */
export async function acquireMutationQueue(owner: object, key: string) {
  let entries = queues.get(owner);
  if (!entries) {
    entries = new Map();
    queues.set(owner, entries);
  }
  const previous = entries.get(key) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  entries.set(key, next);
  await previous;
  return () => {
    release();
    if (entries.get(key) === next) entries.delete(key);
  };
}
