import { parseDelimitedText } from "./csv";
import {
  DATA_CLIP_MAX_CELLS,
  cloneDocument,
  columnLetter,
  createUniqueColumnId,
  inferColumnType,
  normalizeSelection,
  type DataClipDocument,
  type DataSelection,
} from "./dataClipModel";

export type GridSelectionMode = "cells" | "rows" | "columns";
export type GridSelection = DataSelection & { mode: GridSelectionMode };

function adjustAxisForInsert(selection: DataSelection, axis: "row" | "column", index: number, count: number, oldCount: number) {
  const startKey = axis === "row" ? "rowStart" : "columnStart";
  const endKey = axis === "row" ? "rowEnd" : "columnEnd";
  const start = selection[startKey];
  const end = selection[endKey];
  if (index <= start) { selection[startKey] += count; selection[endKey] += count; }
  else if (index <= end || (index === oldCount && end === oldCount - 1)) selection[endKey] += count;
}

export function createColumnName(document: DataClipDocument, index: number) {
  const base = columnLetter(index);
  const names = new Set(document.columns.map((column) => column.name));
  if (!names.has(base)) return base;
  let suffix = 2;
  while (names.has(`${base} ${suffix}`)) suffix++;
  return `${base} ${suffix}`;
}

function assertCellLimit(rows: number, columns: number) {
  if (rows * columns > DATA_CLIP_MAX_CELLS) throw new Error("データは2万セル以下にしてください。");
}

function appendRows(document: DataClipDocument, requiredRows: number) {
  const oldRows = document.rows.length;
  while (document.rows.length < requiredRows) document.rows.push(Array(document.columns.length).fill(""));
  if (document.rows.length > oldRows) document.views.forEach((view) => {
    if (view.selection.rowEnd === oldRows - 1) view.selection.rowEnd = document.rows.length - 1;
  });
}

function appendColumns(document: DataClipDocument, requiredColumns: number) {
  const oldColumns = document.columns.length;
  while (document.columns.length < requiredColumns) {
    const index = document.columns.length;
    document.columns.push({ id: createUniqueColumnId(), name: createColumnName(document, index), type: "string" });
    document.rows.forEach((row) => row.push(""));
  }
  if (document.columns.length > oldColumns) document.views.forEach((view) => {
    if (view.selection.columnEnd === oldColumns - 1) view.selection.columnEnd = document.columns.length - 1;
  });
}

export function pasteOverCells(document: DataClipDocument, startRow: number, startColumn: number, text: string) {
  const pasted = parseDelimitedText(text);
  const width = Math.max(...pasted.map((row) => row.length));
  const requiredRows = startRow + pasted.length;
  const requiredColumns = startColumn + width;
  assertCellLimit(Math.max(document.rows.length, requiredRows), Math.max(document.columns.length, requiredColumns));
  const next = cloneDocument(document);
  const emptyStringColumns = new Set(next.columns.flatMap((column, index) =>
    column.type === "string" && next.rows.every((row) => !(row[index] ?? "").trim()) ? [index] : [],
  ));
  const oldColumns = next.columns.length;
  appendRows(next, requiredRows);
  appendColumns(next, requiredColumns);
  pasted.forEach((row, rowOffset) => row.forEach((value, columnOffset) => {
    next.rows[startRow + rowOffset][startColumn + columnOffset] = value;
  }));
  for (let column = startColumn; column < requiredColumns; column++) {
    if (column >= oldColumns || emptyStringColumns.has(column)) next.columns[column].type = inferColumnType(next.rows.map((row) => row[column]));
  }
  return {
    document: next,
    selection: normalizeGridSelection({ mode: "cells", rowStart: startRow, rowEnd: requiredRows - 1, columnStart: startColumn, columnEnd: requiredColumns - 1 }, next),
  };
}

export function pasteInsertRows(document: DataClipDocument, index: number, text: string) {
  const pasted = parseDelimitedText(text);
  const width = Math.max(...pasted.map((row) => row.length));
  const nextColumns = Math.max(document.columns.length, width);
  assertCellLimit(document.rows.length + pasted.length, nextColumns);
  const next = cloneDocument(document);
  const oldColumns = next.columns.length;
  appendColumns(next, nextColumns);
  const rows = pasted.map((row) => Array.from({ length: next.columns.length }, (_, column) => row[column] ?? ""));
  next.views.forEach((view) => adjustAxisForInsert(view.selection, "row", index, rows.length, next.rows.length));
  next.rows.splice(index, 0, ...rows);
  for (let column = oldColumns; column < next.columns.length; column++) next.columns[column].type = inferColumnType(next.rows.map((row) => row[column]));
  return {
    document: next,
    selection: normalizeGridSelection({ mode: "rows", rowStart: index, rowEnd: index + rows.length - 1, columnStart: 0, columnEnd: next.columns.length - 1 }, next),
  };
}

export function pasteInsertColumns(document: DataClipDocument, index: number, text: string) {
  const pasted = parseDelimitedText(text);
  if (pasted.length < 2) throw new Error("列の貼り付けには列名と1行以上のデータが必要です。");
  const width = Math.max(...pasted.map((row) => row.length));
  const dataRows = pasted.slice(1);
  const requiredRows = Math.max(document.rows.length, dataRows.length);
  assertCellLimit(requiredRows, document.columns.length + width);
  const next = cloneDocument(document);
  appendRows(next, requiredRows);
  next.views.forEach((view) => adjustAxisForInsert(view.selection, "column", index, width, next.columns.length));
  const columns = Array.from({ length: width }, (_, offset) => ({
    id: createUniqueColumnId(),
    name: pasted[0][offset]?.trim() || createColumnName(next, index + offset),
    type: inferColumnType(dataRows.map((row) => row[offset] ?? "")),
  }));
  next.columns.splice(index, 0, ...columns);
  next.rows.forEach((row, rowIndex) => row.splice(index, 0, ...Array.from({ length: width }, (_, offset) => dataRows[rowIndex]?.[offset] ?? "")));
  return {
    document: next,
    selection: normalizeGridSelection({ mode: "columns", rowStart: 0, rowEnd: next.rows.length - 1, columnStart: index, columnEnd: index + width - 1 }, next),
  };
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
