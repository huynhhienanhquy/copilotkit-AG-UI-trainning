import { expect, it } from "vitest";
import { extractDocument } from "../extraction";
import { docxFixture, pdfFixture } from "./document-fixtures";
import { createCitationChunks } from "../attachments";

it("extracts known TXT/Markdown, PDF and DOCX fixtures using real bounded parsers", async () => {
  const text = "# Ghibli cuối tuần 🌿\n".repeat(8000);
  expect((await extractDocument(Buffer.from(text), "text")).text).toBe(text);
  const pdf = await extractDocument(pdfFixture(), "pdf");
  expect(pdf.text).toContain("Totoro picnic at noon");
  expect(pdf.pages).toEqual([{ page: 1, start: 0, end: pdf.text.length }]);
  const docx = await extractDocument(docxFixture(), "docx");
  expect(docx.text.trim()).toBe("Totoro cuối tuần 🌿");
  expect(docx.pages).toEqual([{ page: 1, start: 0, end: docx.text.length }]);
});

it("reports unreadable, blank and malformed documents without fabricating text", async () => {
  await expect(extractDocument(pdfFixture(""), "pdf")).rejects.toMatchObject({
    message: expect.stringContaining("OCR"),
  });
  await expect(
    extractDocument(Buffer.from("%PDF-broken"), "pdf"),
  ).rejects.toMatchObject({ code: "extraction_failed" });
  await expect(
    extractDocument(Buffer.from("PKbroken"), "docx"),
  ).rejects.toMatchObject({ code: "extraction_failed" });
  await expect(
    extractDocument(Buffer.from("   "), "text"),
  ).rejects.toMatchObject({ code: "extraction_failed" });
});

it("retains physical PDF page provenance when a requested segment spans pages", async () => {
  const document = await extractDocument(
    pdfFixture([
      "Kiki delivers bread.",
      "Totoro arrives at noon.",
      "Ponyo brings lunch.",
    ]),
    "pdf",
  );
  expect(document.pages.map((page) => page.page)).toEqual([1, 2, 3]);
  for (const [index, expected] of ["Kiki", "Totoro", "Ponyo"].entries()) {
    const page = document.pages[index];
    expect(document.text.slice(page.start, page.end)).toContain(expected);
  }
  const start = document.pages[1].start + 3;
  const end = document.pages[2].start + 8;
  const attachmentId = "123e4567-e89b-42d3-a456-426614174000";
  const chunks = createCitationChunks(
    document,
    attachmentId,
    "schedule.pdf",
    start,
    end,
  );
  expect(chunks.map((chunk) => chunk.page)).toEqual([2, 3]);
  expect(chunks[0].start).toBe(start);
  expect(chunks[0].end).toBe(document.pages[1].end);
  expect(chunks[1].start).toBe(document.pages[2].start);
  expect(chunks[1].end).toBe(end);
  expect(chunks.map((chunk) => chunk.text).join("")).toBe(
    document.text.slice(start, end),
  );
  for (const chunk of chunks)
    expect(chunk.citation).toBe(
      `\u3010cite:${attachmentId}:p${chunk.page}:${chunk.start}-${chunk.end}\u3011`,
    );
});
