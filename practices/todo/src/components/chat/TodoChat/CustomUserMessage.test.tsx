import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { CustomUserMessage } from "./CustomUserMessage";

it("preserves authored text and does not execute markup", () => {
  const { container } = render(<CustomUserMessage content={"First\n<script>alert(1)</script>"} />);
  expect(screen.getByText(/First/).textContent).toBe("First\n<script>alert(1)</script>");
  expect(container.querySelector("script")).toBeNull();
});
