import { useEffect, useId, useRef, useState } from "react";
import type { InputProps } from "@copilotkit/react-ui";
import { CustomSystemMessage } from "./CustomSystemMessage";

/**
 * Multi-line chat input with send-on-Enter, Shift+Enter newline, and
 * IME composition handling for languages like Vietnamese and Chinese.
 *
 * Features:
 *   - Auto-resizes the textarea up to 144px as the user types.
 *   - Blocks duplicate sends while a request is in flight or during IME composition.
 *   - On network failure, restores the submitted text and shows an error so the
 *     user can retry without retyping.
 *   - Auto-focuses when the chat panel opens (controlled by isVisible).
 *
 * This component replaces the default CopilotKit input inside TodoCopilot.
 *
 * When to use: As the Input slot of CopilotPopup in the TodoChat feature.
 *
 * @param inProgress - Whether the assistant is currently processing a request; disables the send button and textarea.
 * @param onSend - Async callback that delivers the trimmed message to Copilot; may throw on network failure.
 * @param isVisible - When true, the textarea receives focus (e.g., when the chat panel opens).
 */
export function CustomInput({ inProgress, onSend, isVisible = true }: InputProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const sendingRef = useRef(false);
  const composingRef = useRef(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(true);
  const id = useId();
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => { if (isVisible) textarea.current?.focus(); }, [isVisible]);
  useEffect(() => {
    if (!textarea.current) return;
    textarea.current.style.height = "auto";
    textarea.current.style.height = `${Math.min(textarea.current.scrollHeight, 144)}px`;
  }, [text]);

  /**
   * Send the current draft to Copilot if it is non-empty and no request is in flight.
   *
   * Clears the textarea immediately for a responsive feel, then awaits onSend.
   * If onSend throws (network error, timeout, abort), the original text is
   * restored and an error banner is shown so the user can retry. The sending
   * ref prevents double-submits while the async operation is pending.
   */
  async function send() {
    if (!text.trim() || inProgress || sendingRef.current || composingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError("");
    const submitted = text;
    setText("");
    try {
      await onSend(submitted.trim());
    } catch {
      if (mounted.current) {
        setText(submitted);
        setError("Copilot could not finish the response. Your draft is saved. Try again or use Retry response.");
      }
    } finally {
      sendingRef.current = false;
      if (mounted.current) setSending(false);
    }
  }

  return (
    <div className="todo-chat-composer">
      {error && <CustomSystemMessage tone="error">{error}</CustomSystemMessage>}
      <form onSubmit={(event) => { event.preventDefault(); void send(); }}>
        <label className="sr-only" htmlFor={id}>Message Copilot</label>
        <textarea ref={textarea} id={id} value={text} rows={2} maxLength={4000}
          placeholder="Ask Copilot to add or update a task…"
          readOnly={sending || inProgress}
          aria-describedby={`${id}-hint`}
          onChange={(event) => { setText(event.target.value); setError(""); }}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={() => { composingRef.current = false; }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !composingRef.current && event.keyCode !== 229) {
              event.preventDefault();
              void send();
            }
          }} />
        <div className="todo-chat-composer-footer">
          <span id={`${id}-hint`}>Enter to send · Shift+Enter for a new line</span>
          <button type="submit" className="todo-button todo-button-primary"
            disabled={!text.trim() || inProgress || sending}>{sending || inProgress ? "Working…" : "Send"}</button>
        </div>
      </form>
    </div>
  );
}
