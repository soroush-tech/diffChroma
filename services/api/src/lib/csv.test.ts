import { describe, expect, it } from "vitest";
import { toCsv } from "@diffchroma/shared";

describe("toCsv", () => {
  it("emits a header-only document for zero rows", () => {
    expect(toCsv(["a", "b"], [])).toBe("a,b\r\n");
  });

  it("quotes fields containing commas, quotes, and newlines", () => {
    const csv = toCsv(
      ["test", "note"],
      [
        ["Button, Primary", 'says "hi"'],
        ["multi\nline", "plain"],
      ],
    );
    expect(csv).toBe('test,note\r\n"Button, Primary","says ""hi"""\r\n"multi\nline",plain\r\n');
  });

  it("renders null/undefined as empty and numbers verbatim", () => {
    expect(toCsv(["a", "b", "c"], [[null, undefined, 3]])).toBe("a,b,c\r\n,,3\r\n");
  });
});
