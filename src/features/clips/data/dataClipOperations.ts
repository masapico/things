import { parseDelimitedText } from "./csv";
import {
  cloneDocument,
  inferColumnType,
  normalizeSelection,
  type DataClipDocument,
  type DataSelection,
} from "./dataClipModel";

export type GridSelectionMode = "cells" | "rows" | "columns";
export type GridSelection = DataSelection & { mode: GridSelectionMode };

export function pasteOverSelection(document: DataClipDocument, selection: GridSelection, text: string) {
  if (selection.mode === "cells") throw new Error("行番号または列記号から貼り付け先を選択してください。");
  const pasted = parseDelimitedText(text);
  const expectedRows = selection.mode === "rows" ? selection.rowEnd - selection.rowStart + 1 : document.rows.length;
  const expectedColumns = selection.mode === "columns" ? selection.columnEnd - selection.columnStart + 1 : document.columns.length;
  const actualColumns = pasted.length ? Math.max(...pasted.map((row) => row.length)) : 0;
  const rectangular = pasted.every((row) => row.length === actualColumns);
  if (pasted.length !== expectedRows || actualColumns !== expectedColumns || !rectangular) {
    const actual = rectangular ? `${pasted.length}行 × ${actualColumns}列` : `${pasted.length}行（列数が不揃い）`;
    throw new Error(`選択範囲は${expectedRows}行 × ${expectedColumns}列です。貼り付けデータは${actual}でした。`);
  }

  const next = cloneDocument(document);
  const targetColumnStart = selection.mode === "columns" ? selection.columnStart : 0;
  const targetRowStart = selection.mode === "rows" ? selection.rowStart : 0;
  const targetColumns = Array.from({ length: expectedColumns }, (_, offset) => targetColumnStart + offset);
  const emptyStringColumns = new Set(targetColumns.filter((index) =>
    next.columns[index].type === "string" && next.rows.every((row) => !(row[index] ?? "").trim()),
  ));
  pasted.forEach((row, rowOffset) => row.forEach((value, columnOffset) => {
    next.rows[targetRowStart + rowOffset][targetColumnStart + columnOffset] = value;
  }));
  for (const column of emptyStringColumns) {
    next.columns[column].type = inferColumnType(next.rows.map((row) => row[column]));
  }
  return next;
}

export function normalizeGridSelection(selection: GridSelection, document: DataClipDocument): GridSelection {
  const normalized = normalizeSelection(selection, document.rows.length, document.columns.length);
  if (selection.mode === "rows") return { ...normalized, mode: "rows", columnStart: 0, columnEnd: document.columns.length - 1 };
  if (selection.mode === "columns") return { ...normalized, mode: "columns", rowStart: 0, rowEnd: document.rows.length - 1 };
  return { ...normalized, mode: "cells" };
}

export function gridSelectionForView(selection: DataSelection): GridSelection {
  return { ...selection, mode: "cells" };
}

export function viewSelectionFromGrid(selection: GridSelection, document: DataClipDocument): DataSelection {
  const normalized = normalizeGridSelection(selection, document);
  return { rowStart: normalized.rowStart, rowEnd: normalized.rowEnd, columnStart: normalized.columnStart, columnEnd: normalized.columnEnd };
}
