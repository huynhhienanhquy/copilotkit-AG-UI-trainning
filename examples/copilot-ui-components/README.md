# CopilotKit UI Components Examples

Interactive UI showcase and examples for the three main CopilotKit UI components:
- **`CopilotChat`**: Embedded / Inline chat component for custom layouts.
- **`CopilotSidebar`**: Slide-over collapsible drawer assistant.
- **`CopilotPopup`**: Floating action modal / corner widget.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd examples/copilot-ui-components
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧩 Components Overview

### 1. CopilotChat (Inline / Embedded)
```tsx
import { CopilotChat } from "@copilotkit/react-ui";

<CopilotChat
  instructions="Help the user analyze dashboard metrics."
  labels={{
    title: "AI Workspace Assistant",
    initial: "Hi! 👋 Ask me anything about your project.",
    placeholder: "Type your query...",
  }}
  className="h-[600px] rounded-xl border"
/>
```

### 2. CopilotSidebar (Collapsible Drawer)
```tsx
import { CopilotSidebar } from "@copilotkit/react-ui";

<CopilotSidebar
  defaultOpen={true}
  clickOutsideToClose={false}
  instructions="Help the user navigate and interact with page data."
  labels={{
    title: "Copilot Assistant",
    initial: "How can I help you today?",
    placeholder: "Ask sidebar copilot...",
  }}
>
  <YourDashboardContent />
</CopilotSidebar>
```

### 3. CopilotPopup (Floating Corner Widget)
```tsx
import { CopilotPopup } from "@copilotkit/react-ui";

<CopilotPopup
  defaultOpen={true}
  clickOutsideToClose={true}
  hitEscapeToClose={true}
  shortcut="k"
  instructions="Quick popup assistant."
  labels={{
    title: "Copilot Assistant",
    initial: "Need quick help?",
    placeholder: "Ask anything...",
  }}
/>
```
