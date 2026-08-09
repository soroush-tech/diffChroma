/** RFC 4180 CSV serialization: CRLF row endings, fields quoted when they
 *  contain a comma, quote, or line break, embedded quotes doubled. */

export type CsvValue = string | number | boolean | null | undefined;

function toCsvField(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(header: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
  const lines = [header, ...rows].map((row) => row.map(toCsvField).join(","));
  return `${lines.join("\r\n")}\r\n`;
}
