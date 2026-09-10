# Frontend Testing Examples

Examples demonstrating co-located component tests, Storybook stories, and hook unit tests.

---

## 1. Co-Located UI Component and Storybook Structure

### Preferred Layout:
```text
components/
└── AiChatWidget/
    ├── AiChatWidget.tsx
    ├── AiChatWidget.styles.ts
    ├── AiChatWidget.test.tsx
    └── AiChatWidget.stories.tsx
```

### Component Test Example (React Testing Library)
```tsx
// components/AiChatWidget/AiChatWidget.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiChatWidget } from "./AiChatWidget";

describe("AiChatWidget", () => {
  it("submits message on user click", async () => {
    const onSend = vi.fn();
    render(<AiChatWidget onSend={onSend} />);

    const input = screen.getByRole("textbox", { name: /message/i });
    const sendButton = screen.getByRole("button", { name: /send/i });

    await userEvent.type(input, "Hello AI");
    await userEvent.click(sendButton);

    expect(onSend).toHaveBeenCalledWith("Hello AI");
    expect(input).toHaveValue("");
  });
});
```

### Storybook Story Example
```tsx
// components/AiChatWidget/AiChatWidget.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { AiChatWidget } from "./AiChatWidget";

const meta: Meta<typeof AiChatWidget> = {
  title: "Components/AiChatWidget",
  component: AiChatWidget,
};
export default meta;

type Story = StoryObj<typeof AiChatWidget>;

export const Default: Story = {
  args: {
    placeholder: "Ask something...",
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};
```

---

## 2. Logic Unit Test Structure (Hooks & Utils)

### Preferred Layout:
```text
hooks/
├── __tests__/
│   └── useDebounce.test.ts
└── useDebounce.ts
```

### Hook Unit Test Example
```typescript
// hooks/__tests__/useDebounce.test.ts
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "../useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates value after specified delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "first", delay: 300 } }
    );

    expect(result.current).toBe("first");

    rerender({ value: "second", delay: 300 });
    expect(result.current).toBe("first"); // Not yet updated

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("second"); // Updated after delay
  });
});
```
