import Papa from "papaparse";
import { DATA_CLIP_MAX_BYTES, DATA_CLIP_MAX_CELLS } from "./dataClipModel";

export function parseDelimitedText(text: string): string[][] {
  if (new Blob([text]).size > DATA_CLIP_MAX_BYTES) throw new Error("貼り付けデータは1MiB以下にしてください。");
  const delimiter = text.includes("\t") ? "\t" : "";
  const result = Papa.parse<string[]>(text, { delimiter, skipEmptyLines: "greedy" });
  const fatalError = result.errors.find((error) => error.code !== "UndetectableDelimiter");
  if (fatalError) throw new Error(`解析できませんでした: ${fatalError.message}`);
  const rows = result.data.map((row) => row.map((cell) => String(cell ?? "")));
  const cellCount = rows.reduce((total, row) => total + row.length, 0);
  if (cellCount > DATA_CLIP_MAX_CELLS) throw new Error("データは2万セル以下にしてください。");
  return rows;
}

function safeSpreadsheetCell(value: string) {
  return /^[=+@-]/.test(value) ? `'${value}` : value;
}

export function exportCsv(headers: string[], rows: string[][]) {
  const safeRows = rows.map((row) => row.map(safeSpreadsheetCell));
  return `\uFEFF${Papa.unparse([headers, ...safeRows], { newline: "\r\n" })}`;
}
