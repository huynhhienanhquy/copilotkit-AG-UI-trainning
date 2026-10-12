import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  InfiniteData,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query";
import type { UndoToastRequest } from "@/components/practice/undo-toast";
import { practiceApi } from "./api";
import type { Conversation, Page, ThreadPatch } from "./contracts";
import { acquireMutationQueue } from "./mutation-queue";
import {
  conversationUndoPatch,
  optimisticConversation,
  updateConversationPages,
} from "./optimistic-updates";

type Variables = {
  id: string;
  patch: ThreadPatch;
  announce?: boolean;
};

type Context = {
  snapshot: [QueryKey, unknown][];
  previous: Conversation;
  optimistic: Conversation;
  release: () => void;
};

function findCachedConversation(client: QueryClient, id: string) {
  const detail = client.getQueryData<Conversation>(["practice", "thread", id]);
  if (detail) return detail;
  for (const [, data] of client.getQueriesData<
    InfiniteData<Page<Conversation>>
  >({
    queryKey: ["practice", "threads"],
  })) {
    const conversation = data?.pages
      .flatMap((page) => page.items)
      .find((item) => item.id === id);
    if (conversation) return conversation;
  }
}

function writeConversationCaches(
  client: QueryClient,
  conversation: Conversation,
  previous: Conversation,
) {
  const detailKey = ["practice", "thread", conversation.id] as const;
  if (client.getQueryState(detailKey))
    client.setQueryData(detailKey, conversation);
  for (const [key] of client.getQueriesData({
    queryKey: ["practice", "threads"],
  })) {
    const scope = key[2];
    if (scope !== "active" && scope !== "archived") continue;
    client.setQueryData<InfiniteData<Page<Conversation>>>(key, (data) =>
      updateConversationPages(data, conversation, scope, previous),
    );
  }
}

/** Use one reversible mutation path for sidebar controls and agent tools. */
export function useConversationMutation({
  showUndo,
  onError,
  onMutate,
}: {
  showUndo: (request: UndoToastRequest) => void;
  onError: (error: Error) => void;
  onMutate?: () => void;
}) {
  const client = useQueryClient();
  const mutation = useMutation<Conversation, Error, Variables, Context>({
    mutationFn: ({ id, patch }) =>
      practiceApi<Conversation>(`/threads/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onMutate: async ({ id, patch }) => {
      onMutate?.();
      const release = await acquireMutationQueue(client, "conversations");
      try {
        await Promise.all([
          client.cancelQueries({ queryKey: ["practice", "threads"] }),
          client.cancelQueries({ queryKey: ["practice", "thread", id] }),
        ]);
        // Search may target a conversation outside the loaded sidebar pages.
        // Read its prior state so Undo can restore it accurately, even for no-ops.
        const previous =
          findCachedConversation(client, id) ??
          (await practiceApi<Conversation>(`/threads/${id}`));
        const snapshot: [QueryKey, unknown][] = [
          ...client.getQueriesData({ queryKey: ["practice", "threads"] }),
          ...client.getQueriesData({
            queryKey: ["practice", "thread", id],
            exact: true,
          }),
        ];
        const optimistic = optimisticConversation(
          previous,
          patch,
          new Date().toISOString(),
        );
        writeConversationCaches(client, optimistic, previous);
        return { snapshot, previous, optimistic, release };
      } catch (failure) {
        release();
        throw failure;
      }
    },
    onSuccess: (saved, { id, patch, announce = true }, context) => {
      if (context) writeConversationCaches(client, saved, context.optimistic);
      const inverse = context && conversationUndoPatch(context.previous, patch);
      if (!announce || !inverse) return;
      const changedFields = Object.keys(inverse);
      const message =
        changedFields.length > 1
          ? "Conversation updated"
          : inverse.archived !== undefined
            ? patch.archived
              ? "Conversation archived"
              : "Conversation restored"
            : inverse.pinned !== undefined
              ? patch.pinned
                ? "Conversation pinned"
                : "Conversation unpinned"
              : "Conversation renamed";
      showUndo({
        message,
        onUndo: async () => {
          await mutation.mutateAsync({ id, patch: inverse, announce: false });
        },
      });
    },
    onError: (failure, _variables, context) => {
      for (const [key, data] of context?.snapshot ?? [])
        client.setQueryData(key, data);
      onError(failure);
    },
    onSettled: async (_data, _failure, { id }, context) => {
      try {
        await Promise.all([
          client.invalidateQueries({ queryKey: ["practice", "threads"] }),
          client.invalidateQueries({ queryKey: ["practice", "search"] }),
          client.invalidateQueries({ queryKey: ["practice", "thread", id] }),
        ]);
      } finally {
        context?.release();
      }
    },
  });
  return mutation;
}
