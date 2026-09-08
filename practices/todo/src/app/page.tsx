"use client";

import { CopilotKit } from "@copilotkit/react-core";
import { TodoList } from "@/components/common/TodoList";
import { TodoCopilot } from "@/components/chat/TodoChat/TodoCopilot";

export default function Home() {
  return (
    <main className="todo-app">
      <header className="todo-page-heading">
        <span className="todo-eyebrow">COPILOTKIT · TODO</span>
        <h1>Make room for what matters.</h1>
        <p>Keep your tasks clear, and let Copilot help with the details.</p>
      </header>
      <CopilotKit runtimeUrl="/api/copilotkit">
        <TodoList />
        <TodoCopilot />
      </CopilotKit>
    </main>
  );
}
