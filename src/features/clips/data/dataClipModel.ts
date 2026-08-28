export type DataColumnType = "string" | "number" | "date";
export type DataViewType = "table" | "line" | "bar" | "scatter" | "kpi";
export type KpiAggregation = "latest" | "sum" | "average" | "min" | "max" | "count";

export type DataColumn = {
  id: string;
  name: string;
  type: DataColumnType;
};

export type DataSelection = {
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
};

export type DataVisualization = {
  type: DataViewType;
  title: string;
  xColumnId?: string;
  yColumnIds: string[];
  unit: string;
  kpiAggregation: KpiAggregation;
};

export type DataClipDocumentV1 = {
  version: 1;
  columns: DataColumn[];
  rows: string[][];
  selection: DataSelection;
  visualization: DataVisualization;
};

export const DATA_CLIP_MAX_BYTES = 1024 * 1024;
export const DATA_CLIP_MAX_CELLS = 20_000;

export function createColumnId(index: number) {
  return `column-${index + 1}`;
}

export function columnLetter(index: number) {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

export function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/,/g, "");
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDate(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?$/.test(trimmed)) return null;
  const parsed = Date.parse(trimmed.replace(/\//g, "-"));
  return Number.isNaN(parsed) ? null : parsed;
}

export function inferColumnType(values: string[]): DataColumnType {
  const nonEmpty = values.filter((value) => value.trim() !== "");
  if (nonEmpty.length === 0) return "string";
  if (nonEmpty.every((value) => parseNumber(value) !== null)) return "number";
  if (nonEmpty.every((value) => parseDate(value) !== null)) return "date";
  return "string";
}

export function normalizeRows(rows: string[][]): string[][] {
  const width = Math.max(0, ...rows.map((row) => row.length));
  return rows.map((row) => Array.from({ length: width }, (_, index) => row[index] ?? ""));
}

export function createDataDocument(inputRows: string[][], firstRowIsHeader: boolean): DataClipDocumentV1 {
  const normalized = normalizeRows(inputRows).filter((row) => row.some((cell) => cell.trim() !== ""));
  if (normalized.length === 0 || normalized[0].length === 0) throw new Error("データがありません。");
  const header = firstRowIsHeader ? normalized[0] : [];
  const rows = firstRowIsHeader ? normalized.slice(1) : normalized;
  if (rows.length === 0) throw new Error("データ行がありません。");
  const columns = normalized[0].map((_, index) => ({
    id: createColumnId(index),
    name: header[index]?.trim() || columnLetter(index),
    type: inferColumnType(rows.map((row) => row[index] ?? "")),
  }));
  const numeric = columns.filter((column) => column.type === "number");
  return {
    version: 1,
    columns,
    rows,
    selection: { rowStart: 0, rowEnd: rows.length - 1, columnStart: 0, columnEnd: columns.length - 1 },
    visualization: {
      type: "table",
      title: "",
      xColumnId: columns[0]?.id,
      yColumnIds: numeric.slice(0, 1).map((column) => column.id),
      unit: "",
      kpiAggregation: "latest",
    },
  };
}

export function transposeDataDocument(document: DataClipDocumentV1): DataClipDocumentV1 {
  const matrix = [
    document.columns.map((column) => column.name),
    ...document.rows.map((row) => document.columns.map((_, index) => row[index] ?? "")),
  ];
  const width = matrix[0].length;
  const transposed = Array.from({ length: width }, (_, columnIndex) =>
    matrix.map((row) => row[columnIndex] ?? ""),
  );
  const next = createDataDocument(transposed, true);
  next.visualization.title = document.visualization.title;
  next.visualization.unit = document.visualization.unit;
  return next;
}

export function normalizeSelection(selection: DataSelection, rowCount: number, columnCount: number): DataSelection {
  const maxRow = Math.max(0, rowCount - 1);
  const maxColumn = Math.max(0, columnCount - 1);
  const rowStart = Math.min(maxRow, Math.max(0, Math.min(selection.rowStart, selection.rowEnd)));
  const rowEnd = Math.min(maxRow, Math.max(rowStart, Math.max(selection.rowStart, selection.rowEnd)));
  const columnStart = Math.min(maxColumn, Math.max(0, Math.min(selection.columnStart, selection.columnEnd)));
  const columnEnd = Math.min(maxColumn, Math.max(columnStart, Math.max(selection.columnStart, selection.columnEnd)));
  return { rowStart, rowEnd, columnStart, columnEnd };
}

export function selectedRows(document: DataClipDocumentV1) {
  const selection = normalizeSelection(document.selection, document.rows.length, document.columns.length);
  return document.rows.slice(selection.rowStart, selection.rowEnd + 1);
}

export function selectedColumns(document: DataClipDocumentV1) {
  const selection = normalizeSelection(document.selection, document.rows.length, document.columns.length);
  return document.columns.slice(selection.columnStart, selection.columnEnd + 1);
}

export function calculateKpi(values: string[], aggregation: KpiAggregation): number | null {
  const numbers = values.map(parseNumber).filter((value): value is number => value !== null);
  if (aggregation === "count") return numbers.length;
  if (numbers.length === 0) return null;
  if (aggregation === "latest") return numbers[numbers.length - 1];
  if (aggregation === "sum") return numbers.reduce((sum, value) => sum + value, 0);
  if (aggregation === "average") return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  if (aggregation === "min") return Math.min(...numbers);
  return Math.max(...numbers);
}

export function validateDataDocument(value: unknown): value is DataClipDocumentV1 {
  if (!value || typeof value !== "object") return false;
  const document = value as Partial<DataClipDocumentV1>;
  return document.version === 1 && Array.isArray(document.columns) && document.columns.length > 0 &&
    Array.isArray(document.rows) && document.rows.length > 0 && !!document.selection && !!document.visualization;
}

export function validateVisualization(document: DataClipDocumentV1): string | null {
  const { visualization } = document;
  if (visualization.type === "table") return null;
  const columns = selectedColumns(document);
  const selectedIds = new Set(columns.map((column) => column.id));
  const numericIds = new Set(columns.filter((column) => column.type === "number").map((column) => column.id));
  if (visualization.type === "line" || visualization.type === "bar") {
    if (!visualization.xColumnId || !selectedIds.has(visualization.xColumnId)) return "選択範囲内のX軸を指定してください。";
    if (visualization.yColumnIds.length === 0 || visualization.yColumnIds.some((id) => !numericIds.has(id))) return "選択範囲内の数値列を指定してください。";
  }
  if (visualization.type === "scatter") {
    if (!visualization.xColumnId || !numericIds.has(visualization.xColumnId) || visualization.yColumnIds.length !== 1 || !numericIds.has(visualization.yColumnIds[0])) return "数値のX軸とY軸を1列ずつ指定してください。";
  }
  if (visualization.type === "kpi" && (visualization.yColumnIds.length !== 1 || !numericIds.has(visualization.yColumnIds[0]))) return "KPIの数値列を1つ指定してください。";
  const plottedIds = visualization.type === "scatter" || visualization.type === "kpi" ? visualization.yColumnIds.slice(0, 1) : visualization.yColumnIds;
  const hasValue = plottedIds.some((id) => {
    const index = document.columns.findIndex((column) => column.id === id);
    return selectedRows(document).some((row) => parseNumber(row[index] ?? "") !== null);
  });
  if (!hasValue) return "選択範囲に描画できる数値がありません。";
  return null;
}

export function cloneDocument(document: DataClipDocumentV1): DataClipDocumentV1 {
  return structuredClone(document);
}
