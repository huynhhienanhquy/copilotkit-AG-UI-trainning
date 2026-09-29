"use client";

import { useEffect, useRef } from "react";
import {
  LoaderCircle,
  MessageSquare,
  PlusSquare,
  RefreshCw,
} from "lucide-react";
import {
  UseAgentUpdate,
  useAgent,
  useThreads,
} from "@copilotkit/react-core/v2";

import styles from "@/app/page.module.css";

const AGENT_ID = "default";

type ConversationSidebarProps = {
  activeThreadId?: string;
  onNewThread: () => void;
  onSelectThread: (threadId: string) => void;
};

export function ConversationSidebar({
  activeThreadId,
  onNewThread,
  onSelectThread,
}: Readonly<ConversationSidebarProps>) {
  const { agent } = useAgent({
    agentId: AGENT_ID,
    updates: [UseAgentUpdate.OnRunStatusChanged],
  });
  const {
    threads,
    isLoading,
    error,
    refetchThreads,
    startNewThread,
  } = useThreads({
    agentId: AGENT_ID,
  });
  const wasRunning = useRef(agent.isRunning);

  useEffect(() => {
    if (wasRunning.current && !agent.isRunning) {
      refetchThreads();
    }

    wasRunning.current = agent.isRunning;
  }, [agent.isRunning, refetchThreads]);

  const handleNewThread = () => {
    startNewThread();
    onNewThread();
  };

  return (
    <nav className={styles.conversationSidebar} aria-label="Conversations">
      <button
        type="button"
        className={styles.newConversationButton}
        onClick={handleNewThread}
      >
        <PlusSquare aria-hidden="true" size={18} strokeWidth={1.8} />
        <span>New Conversation</span>
      </button>

      <div className={styles.conversationHeadingRow}>
        <h2 className={styles.conversationHeading}>Recent Conversations</h2>
        <button
          type="button"
          className={styles.refreshThreadsButton}
          onClick={refetchThreads}
          aria-label="Refresh conversations"
          title="Refresh conversations"
          disabled={isLoading}
        >
          <RefreshCw
            aria-hidden="true"
            size={15}
            className={isLoading ? styles.spinningIcon : undefined}
          />
        </button>
      </div>

      <div className={styles.conversationList} aria-live="polite">
        {isLoading ? (
          <div className={styles.sidebarStatus}>
            <LoaderCircle
              aria-hidden="true"
              size={17}
              className={styles.spinningIcon}
            />
            <span>Loading conversations...</span>
          </div>
        ) : error ? (
          <div className={styles.sidebarError} role="alert">
            <p>Could not load conversations.</p>
            <button type="button" onClick={refetchThreads}>
              Try again
            </button>
          </div>
        ) : threads.length === 0 ? (
          <p className={styles.sidebarEmpty}>
            Your conversations will appear here after you send a message.
          </p>
        ) : (
          threads.map((thread) => {
            const isActive = thread.id === activeThreadId;
            const label =
              thread.name?.trim() || formatConversationLabel(thread.createdAt);

            return (
              <button
                type="button"
                key={thread.id}
                className={`${styles.conversationItem} ${
                  isActive ? styles.conversationItemActive : ""
                }`}
                onClick={() => onSelectThread(thread.id)}
                aria-current={isActive ? "page" : undefined}
              >
                <MessageSquare aria-hidden="true" size={16} />
                <span>{label}</span>
              </button>
            );
          })
        )}
      </div>

      <p className={styles.sidebarPersistenceNote}>
        Local history is kept while the development server is running.
      </p>
    </nav>
  );
}

function formatConversationLabel(createdAt: Date | string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "Untitled conversation";
  }

  return `Conversation ${new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)}`;
}
