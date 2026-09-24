import { expect, it } from "vitest";
import { extractDocument } from "../extraction";
import { docxFixture, pdfFixture } from "./document-fixtures";

it("extracts known TXT/Markdown, PDF and DOCX fixtures using real bounded parsers", async () => {
  const text = "# Ghibli cuối tuần 🌿\n".repeat(8000);
  expect((await extractDocument(Buffer.from(text), "text")).text).toBe(text);
  const pdf = await extractDocument(pdfFixture(), "pdf");
  expect(pdf.text).toContain("Totoro picnic at noon");
  expect(pdf.pages).toEqual([{ page: 1, start: 0, end: pdf.text.length }]);
  expect((await extractDocument(docxFixture(), "docx")).text.trim()).toBe("Totoro cuối tuần 🌿");
});

it("reports unreadable, blank and malformed documents without fabricating text", async () => {
  await expect(extractDocument(pdfFixture(""), "pdf")).rejects.toMatchObject({ message: expect.stringContaining("OCR") });
  await expect(extractDocument(Buffer.from("%PDF-broken"), "pdf")).rejects.toMatchObject({ code: "extraction_failed" });
  await expect(extractDocument(Buffer.from("PKbroken"), "docx")).rejects.toMatchObject({ code: "extraction_failed" });
  await expect(extractDocument(Buffer.from("   "), "text")).rejects.toMatchObject({ code: "extraction_failed" });
});
