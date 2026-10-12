import { expect, it } from "vitest";
import {
  citationFromHref,
  citationMarker,
  citationMarkersToMarkdown,
} from "./citations";

const attachmentId = "123e4567-e89b-42d3-a456-426614174000";

it("round-trips safe attachment citation markers through Markdown links", () => {
  const marker = citationMarker({
    attachmentId,
    page: 3,
    start: 120,
    end: 245,
  });
  const markdown = citationMarkersToMarkdown(
    `Meeting time ${marker}.`,
    () => "notes [final].pdf",
  );
  expect(markdown).toContain(
    `[notes \\[final\\].pdf · p. 3](#attachment-citation:${attachmentId}:p3:120-245)`,
  );
  expect(
    citationFromHref(`#attachment-citation:${attachmentId}:p3:120-245`),
  ).toEqual({ attachmentId, filename: "", page: 3, start: 120, end: 245 });
});

it("does not activate malformed or unknown citations", () => {
  expect(citationFromHref("https://example.com")).toBeNull();
  expect(
    citationFromHref(`#attachment-citation:${attachmentId}:p0:10-5`),
  ).toBeNull();
  expect(
    citationMarkersToMarkdown(
      citationMarker({ attachmentId, page: 1, start: 0, end: 10 }),
      () => undefined,
    ),
  ).toBe("[source unavailable]");
});

it("preserves literal filenames containing Markdown syntax", () => {
  const markdown = citationMarkersToMarkdown(
    citationMarker({ attachmentId, page: 2, start: 10, end: 25 }),
    () => "notes\\[final] _draft_ <review>.pdf",
  );
  expect(markdown).toBe(
    `[notes\\\\\\[final\\] \\_draft\\_ \\<review\\>.pdf · p. 2](#attachment-citation:${attachmentId}:p2:10-25)`,
  );
});
