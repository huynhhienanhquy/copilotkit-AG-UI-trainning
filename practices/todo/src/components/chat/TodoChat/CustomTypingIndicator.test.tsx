import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { CustomTypingIndicator } from "./CustomTypingIndicator";

it("exposes a text status in addition to decorative motion", () => {
  render(<CustomTypingIndicator />);
  expect(screen.getByRole("status")).toHaveTextContent("Copilot is working");
});
