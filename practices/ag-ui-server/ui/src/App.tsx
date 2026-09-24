import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type TaskStatus = "todo" | "in_progress" | "done";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  updatedAt: string;
}

interface WorkspaceState {
  tasks: Task[];
  focus: string;
  lastUpdated: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

type ConversationItem =
  | (ChatMessage & { kind: "message"; streaming?: boolean })
  | { id: string; kind: "tool"; name: string; complete: boolean };

interface AGUIEvent {
  type: string;
  timestamp?: number;
  messageId?: string;
  toolCallId?: string;
  toolCallName?: string;
  delta?: string;
  message?: string;
  snapshot?: WorkspaceState;
}

interface Health {
  status: string;
  mode: "demo" | "openai";
  model: string;
}

const EMPTY_STATE: WorkspaceState = {
  tasks: [],
  focus: "No focus selected",
  lastUpdated: "",
};

const SUGGESTIONS = [
  { label: "Check weather", prompt: "Weather in Bangkok" },
  { label: "Calculate", prompt: "Calculate (12 + 8) * 3" },
  { label: "Create a task", prompt: "Create task Design the interface" },
];

export function App() {
  const [threadId, setThreadId] = useState(() => crypto.randomUUID());
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceState>(EMPTY_STATE);
  const [events, setEvents] = useState<AGUIEvent[]>([]);
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const historyRef = useRef<ChatMessage[]>([]);
  const messagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json() as Promise<Health>)
      .then((value) => {
        setHealth(value);
        setConnectionError(false);
      })
      .catch(() => setConnectionError(true));
  }, []);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [conversation]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
  }, [prompt]);

  const connectionLabel = connectionError
    ? "Stream error"
    : health?.mode === "demo"
      ? "Demo connected"
      : health
        ? "Server connected"
        : "Connecting";

  async function runAgent(rawPrompt: string) {
    const content = rawPrompt.trim();
    if (!content || running) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content };
    historyRef.current = [...historyRef.current, userMessage];
    setConversation((items) => [...items, { ...userMessage, kind: "message" }]);
    setPrompt("");
    setRunning(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          threadId,
          runId: crypto.randomUUID(),
          messages: historyRef.current,
          state: workspace,
          tools: [],
          context: [],
        }),
      });

      if (!response.ok || !response.body) throw new Error(await response.text());
      await consumeEventStream(response.body, handleEvent);
    } catch (error) {
      const content = `Unable to complete the run: ${error instanceof Error ? error.message : String(error)}`;
      const failure: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content };
      setConversation((items) => [...items, { ...failure, kind: "message" }]);
      setConnectionError(true);
    } finally {
      setRunning(false);
      textareaRef.current?.focus();
    }
  }

  function handleEvent(event: AGUIEvent) {
    setEvents((current) => [...current, event]);

    if (event.type === "TEXT_MESSAGE_START" && event.messageId) {
      setConversation((items) => [
        ...items,
        { id: event.messageId!, kind: "message", role: "assistant", content: "", streaming: true },
      ]);
    } else if (event.type === "TEXT_MESSAGE_CONTENT" && event.messageId) {
      setConversation((items) =>
        items.map((item) =>
          item.kind === "message" && item.id === event.messageId
            ? { ...item, content: item.content + (event.delta ?? "") }
            : item,
        ),
      );
    } else if (event.type === "TEXT_MESSAGE_END" && event.messageId) {
      setConversation((items) => {
        const next = items.map((item) =>
          item.kind === "message" && item.id === event.messageId ? { ...item, streaming: false } : item,
        );
        const completed = next.find(
          (item): item is Extract<ConversationItem, { kind: "message" }> =>
            item.kind === "message" && item.id === event.messageId,
        );
        if (completed) {
          historyRef.current = [
            ...historyRef.current,
            { id: completed.id, role: completed.role, content: completed.content },
          ];
        }
        return next;
      });
    } else if (event.type === "TOOL_CALL_START" && event.toolCallId) {
      setConversation((items) => [
        ...items,
        { id: event.toolCallId!, kind: "tool", name: event.toolCallName ?? "tool", complete: false },
      ]);
    } else if (event.type === "TOOL_CALL_RESULT" && event.toolCallId) {
      setConversation((items) =>
        items.map((item) =>
          item.kind === "tool" && item.id === event.toolCallId ? { ...item, complete: true } : item,
        ),
      );
    } else if (event.type === "STATE_SNAPSHOT" && event.snapshot) {
      setWorkspace(event.snapshot);
    } else if (event.type === "RUN_ERROR") {
      const failure: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Run error: ${event.message ?? "Unknown error"}`,
      };
      setConversation((items) => [...items, { ...failure, kind: "message" }]);
    }
  }

  function resetThread() {
    setThreadId(crypto.randomUUID());
    setConversation([]);
    setWorkspace(EMPTY_STATE);
    setEvents([]);
    historyRef.current = [];
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void runAgent(prompt);
  }

  return (
    <div className="page-shell">
      <Header
        label={connectionLabel}
        model={health?.model ?? "—"}
        status={connectionError ? "error" : health ? "online" : "pending"}
      />
      <main>
        <Hero />
        <section className="workspace-grid">
          <ChatPanel
            conversation={conversation}
            messagesRef={messagesRef}
            prompt={prompt}
            setPrompt={setPrompt}
            onSubmit={handleSubmit}
            onSuggestion={runAgent}
            onReset={resetThread}
            running={running}
            textareaRef={textareaRef}
          />
          <aside className="side-stack">
            <StatePanel workspace={workspace} />
            <EventPanel events={events} onClear={() => setEvents([])} />
          </aside>
        </section>
      </main>
      <footer>
        <span>AG-UI protocol playground</span>
        <span>thread / {threadId.slice(0, 8)}</span>
      </footer>
    </div>
  );
}

function Header({ label, model, status }: { label: string; model: string; status: string }) {
  return (
    <header className="topbar">
      <a className="brand" href="#" aria-label="AG-UI Workspace home">
        <span className="brand-mark"><i /><i /><i /></span>
        <span>AG–UI <b>WORKSPACE</b></span>
      </a>
      <div className={`connection ${status}`} aria-live="polite">
        <span className="pulse" />
        <span>{label}</span>
        <span className="divider" />
        <span id="model-label">{model}</span>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div>
        <p className="eyebrow">SERVER-BASED INTEGRATION · PRACTICE 01</p>
        <h1>Agent at work.<br /><em>UI in sync.</em></h1>
      </div>
      <p className="hero-copy">
        A complete AG-UI flow: the server receives a request, the model calls tools,
        shared state changes, and every event streams back to the interface in real time.
      </p>
    </section>
  );
}

interface ChatPanelProps {
  conversation: ConversationItem[];
  messagesRef: React.RefObject<HTMLDivElement | null>;
  prompt: string;
  setPrompt: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onSuggestion: (prompt: string) => Promise<void>;
  onReset: () => void;
  running: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

function ChatPanel(props: ChatPanelProps) {
  return (
    <article className="panel chat-panel">
      <div className="panel-heading">
        <div><span className="section-index">01</span><h2>Conversation</h2></div>
        <button className="icon-button" onClick={props.onReset} title="Start a new thread" aria-label="Start a new thread">↻</button>
      </div>
      <div className="messages" ref={props.messagesRef} aria-live="polite">
        {props.conversation.length === 0 ? (
          <div className="empty-state">
            <div className="orbit"><span /></div>
            <h3>Start an agent run</h3>
            <p>The agent can chat, call tools, and update task state on the server.</p>
            <div className="suggestions">
              {SUGGESTIONS.map((item) => (
                <button key={item.label} onClick={() => void props.onSuggestion(item.prompt)}>{item.label}</button>
              ))}
            </div>
          </div>
        ) : (
          props.conversation.map((item) =>
            item.kind === "tool" ? (
              <div className="tool-activity" key={item.id}>
                {item.complete ? "✓" : "↳"} {item.name} · {item.complete ? "completed" : "preparing"}
              </div>
            ) : (
              <div className={`message ${item.role}`} key={item.id}>
                <div className="avatar">{item.role === "user" ? "YOU" : "AI"}</div>
                <div className={`bubble${item.streaming ? " typing" : ""}`}>{item.content}</div>
              </div>
            ),
          )
        )}
      </div>
      <form className="composer" onSubmit={props.onSubmit}>
        <label htmlFor="prompt" className="sr-only">Enter a message</label>
        <textarea
          id="prompt"
          ref={props.textareaRef}
          rows={1}
          placeholder="Give the agent a task…"
          value={props.prompt}
          onChange={(event) => props.setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          required
        />
        <div className="composer-footer">
          <span><kbd>Enter</kbd> send · <kbd>Shift Enter</kbd> new line</span>
          <button id="send-button" type="submit" disabled={props.running}>
            <span>{props.running ? "Running…" : "Run agent"}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M14 7l5 5-5 5" /></svg>
          </button>
        </div>
      </form>
    </article>
  );
}

function StatePanel({ workspace }: { workspace: WorkspaceState }) {
  return (
    <article className="panel state-panel">
      <div className="panel-heading compact">
        <div><span className="section-index">02</span><h2>Shared state</h2></div>
        <span className="live-tag"><i /> LIVE</span>
      </div>
      <div className="focus-card"><span>Current focus</span><strong>{workspace.focus}</strong></div>
      <div className="task-meta"><span>Tasks</span><span>{workspace.tasks.length} item{workspace.tasks.length === 1 ? "" : "s"}</span></div>
      <div className="task-list">
        {workspace.tasks.length === 0 ? (
          <p className="task-placeholder">State will appear here after the agent calls a tool.</p>
        ) : (
          workspace.tasks.map((task) => (
            <div className={`task-item ${task.status}`} key={task.id}>
              <span className="task-check">{task.status === "done" ? "✓" : ""}</span>
              <span className="task-title">{task.title}</span>
              <span className="task-status">{task.status.replace("_", " ")}</span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function EventPanel({ events, onClear }: { events: AGUIEvent[]; onClear: () => void }) {
  return (
    <article className="panel events-panel">
      <div className="panel-heading compact">
        <div><span className="section-index">03</span><h2>Event stream</h2></div>
        <button className="text-button" onClick={onClear}>CLEAR</button>
      </div>
      <div className="event-list">
        {events.length === 0 ? (
          <div className="event-empty"><span>Waiting for events</span><i /></div>
        ) : (
          events.map((event, index) => (
            <EventRow event={event} key={`${event.timestamp ?? 0}-${event.type}-${index}`} />
          ))
        )}
      </div>
    </article>
  );
}

function EventRow({ event }: { event: AGUIEvent }) {
  const kind = useMemo(
    () => event.type.startsWith("RUN_") ? "run" : event.type.startsWith("TOOL_") ? "tool" : event.type.startsWith("STATE_") ? "state" : "message",
    [event.type],
  );
  const time = new Date(event.timestamp ?? Date.now()).toLocaleTimeString("en-GB", { hour12: false }).slice(0, 8);
  return (
    <div className="event-row" data-kind={kind}>
      <span className="event-time">{time}</span><i className="event-dot" /><span className="event-name">{event.type}</span>
    </div>
  );
}

async function consumeEventStream(body: ReadableStream<Uint8Array>, onEvent: (event: AGUIEvent) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? "";
    for (const frame of frames) parseFrame(frame, onEvent);
    if (done) {
      if (buffer.trim()) parseFrame(buffer, onEvent);
      break;
    }
  }
}

function parseFrame(frame: string, onEvent: (event: AGUIEvent) => void) {
  const payload = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
  if (payload && payload !== "[DONE]") onEvent(JSON.parse(payload) as AGUIEvent);
}
