import { describe, it, expect, vi, beforeEach } from "vitest";

const { getDocumentProxyMock, extractPdfTextMock } = vi.hoisted(() => ({
  getDocumentProxyMock: vi.fn(),
  extractPdfTextMock: vi.fn(),
}));

vi.mock("unpdf", () => ({
  getDocumentProxy: getDocumentProxyMock,
  extractText: extractPdfTextMock,
}));

import {
  extractText,
  ExtractTextError,
  MAX_UPLOAD_BYTES,
  MAX_EXTRACTED_CHARS,
} from "@/lib/parsing/extractText";

describe("extractText", () => {
  beforeEach(() => {
    getDocumentProxyMock.mockReset();
    extractPdfTextMock.mockReset();
  });

  it("extracts plain text files", async () => {
    const buffer = Buffer.from("Hello, this is a contract.", "utf-8");
    const result = await extractText({ buffer, mimeType: "text/plain" });
    expect(result).toBe("Hello, this is a contract.");
  });

  it("extracts markdown files", async () => {
    const buffer = Buffer.from("# Contract\n\nTerms.", "utf-8");
    const result = await extractText({ buffer, mimeType: "text/markdown" });
    expect(result).toBe("# Contract\n\nTerms.");
  });

  it("extracts pdf text via unpdf", async () => {
    getDocumentProxyMock.mockResolvedValue({ id: "fake-pdf" });
    extractPdfTextMock.mockResolvedValue({ totalPages: 1, text: "PDF contract body" });

    const buffer = Buffer.from("%PDF-1.4 fake");
    const result = await extractText({ buffer, mimeType: "application/pdf" });

    expect(result).toBe("PDF contract body");
    expect(getDocumentProxyMock).toHaveBeenCalledWith(expect.any(Uint8Array));
    expect(extractPdfTextMock).toHaveBeenCalledWith({ id: "fake-pdf" }, { mergePages: true });
  });

  it("rejects unsupported mime types", async () => {
    const buffer = Buffer.from("data");
    await expect(
      extractText({ buffer, mimeType: "application/msword" }),
    ).rejects.toMatchObject({ code: "unsupported_mime" });
  });

  it("rejects files over the upload size limit", async () => {
    const buffer = Buffer.alloc(MAX_UPLOAD_BYTES + 1, "a");
    await expect(extractText({ buffer, mimeType: "text/plain" })).rejects.toMatchObject({
      code: "file_too_large",
    });
  });

  it("rejects empty extracted text", async () => {
    const buffer = Buffer.from("   \n\t  ", "utf-8");
    await expect(extractText({ buffer, mimeType: "text/plain" })).rejects.toMatchObject({
      code: "empty_text",
    });
  });

  it("rejects text over the extracted character limit", async () => {
    const buffer = Buffer.from("a".repeat(MAX_EXTRACTED_CHARS + 1), "utf-8");
    await expect(extractText({ buffer, mimeType: "text/plain" })).rejects.toMatchObject({
      code: "text_too_large",
    });
  });

  it("wraps pdf parse failures in a typed error", async () => {
    getDocumentProxyMock.mockRejectedValue(new Error("bad pdf"));

    const buffer = Buffer.from("%PDF-1.4 fake");
    await expect(extractText({ buffer, mimeType: "application/pdf" })).rejects.toMatchObject({
      code: "parse_failed",
    });
  });

  it("ExtractTextError carries a code and message", () => {
    const error = new ExtractTextError("empty_text", "no text");
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("empty_text");
    expect(error.message).toBe("no text");
  });
});
