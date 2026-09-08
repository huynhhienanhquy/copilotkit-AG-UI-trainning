import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { CustomSystemMessage } from "./CustomSystemMessage";

it("announces errors and renders notices without interpreting HTML", () => {
  render(<CustomSystemMessage tone="error">{"<b>Connection failed</b>"}</CustomSystemMessage>);
  expect(screen.getByRole("alert")).toHaveTextContent("<b>Connection failed</b>");
});
