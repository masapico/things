export type DataColumnType = "string" | "number" | "date";
export type DataViewType = "table" | "line" | "bar" | "scatter" | "kpi";
export type KpiAggregation = "latest" | "sum" | "average" | "min" | "max" | "count";

export type DataColumn = { id: string; name: string; type: DataColumnType };
export type DataSelection = { rowStart: number; rowEnd: number; columnStart: number; columnEnd: number };
export type DataVisualization = { type: DataViewType; title: string; xColumnId?: string; yColumnIds: string[]; unit: string; kpiAggregation: KpiAggregation };
export type DataClipView = { id: string; name: string; selection: DataSelection; visualization: DataVisualization };
export type DataClipDocumentV1 = { version: 1; columns: DataColumn[]; rows: string[][]; selection: DataSelection; visualization: DataVisualization };
export type DataClipDocumentV2 = { version: 2; columns: DataColumn[]; rows: string[][]; views: DataClipView[]; defaultViewId: string };
export type DataClipDocument = DataClipDocumentV2;

export const DATA_CLIP_MAX_BYTES = 1024 * 1024;
export const DATA_CLIP_MAX_CELLS = 20_000;

function createId(prefix: string) { return `${prefix}-${globalThis.crypto.randomUUID()}`; }
export function createColumnId(index: number) { return `column-${index + 1}`; }
export function createUniqueColumnId() { return createId("column"); }

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
  const normalized = value.trim().replace(/,/g, "");
  if (!normalized || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized)) return null;
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

function defaultVisualization(columns: DataColumn[]): DataVisualization {
  return { type: "table", title: "", xColumnId: columns[0]?.id, yColumnIds: columns.filter((column) => column.type === "number").slice(0, 1).map((column) => column.id), unit: "", kpiAggregation: "latest" };
}

export function createDataView(columns: DataColumn[], rowCount: number, name: string): DataClipView {
  return { id: createId("view"), name, selection: { rowStart: 0, rowEnd: Math.max(0, rowCount - 1), columnStart: 0, columnEnd: Math.max(0, columns.length - 1) }, visualization: defaultVisualization(columns) };
}

export function createDataDocument(inputRows: string[][], firstRowIsHeader: boolean): DataClipDocument {
  const normalized = normalizeRows(inputRows).filter((row) => row.some((cell) => cell.trim() !== ""));
  if (normalized.length === 0 || normalized[0].length === 0) throw new Error("データがありません。");
  const header = firstRowIsHeader ? normalized[0] : [];
  const rows = firstRowIsHeader ? normalized.slice(1) : normalized;
  if (rows.length === 0) throw new Error("データ行がありません。");
  const columns = normalized[0].map((_, index) => ({ id: createColumnId(index), name: header[index]?.trim() || columnLetter(index), type: inferColumnType(rows.map((row) => row[index] ?? "")) }));
  const view = createDataView(columns, rows.length, "ビュー1");
  return { version: 2, columns, rows, views: [view], defaultViewId: view.id };
}

export function normalizeDataDocument(value: unknown): DataClipDocument | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const columns = input.columns as DataColumn[];
  const rows = input.rows as string[][];
  if (!Array.isArray(columns) || columns.length === 0 || !Array.isArray(rows) || rows.length === 0) return null;
  if (input.version === 2 && Array.isArray(input.views) && input.views.length > 0) {
    const validViews = input.views.every((item) => {
      if (!item || typeof item !== "object") return false;
      const view = item as Partial<DataClipView>;
      return typeof view.id === "string" && typeof view.name === "string" && !!view.selection && !!view.visualization &&
        Array.isArray(view.visualization.yColumnIds) && typeof view.visualization.type === "string";
    });
    if (!validViews) return null;
    const next = structuredClone(input) as DataClipDocument;
    if (!next.views.some((view) => view.id === next.defaultViewId)) next.defaultViewId = next.views[0].id;
    next.views.forEach((view) => { view.selection = normalizeSelection(view.selection, next.rows.length, next.columns.length); });
    return next;
  }
  if (input.version === 1 && input.selection && input.visualization) {
    const view: DataClipView = { id: "view-1", name: "ビュー1", selection: normalizeSelection(input.selection as DataSelection, rows.length, columns.length), visualization: structuredClone(input.visualization) as DataVisualization };
    return { version: 2, columns: structuredClone(columns), rows: normalizeRows(rows), views: [view], defaultViewId: view.id };
  }
  return null;
}

export function validateDataDocument(value: unknown): value is DataClipDocumentV1 | DataClipDocumentV2 { return normalizeDataDocument(value) !== null; }
export function getDefaultView(document: DataClipDocument) { return document.views.find((view) => view.id === document.defaultViewId) ?? document.views[0]; }

export function transposeDataDocument(document: DataClipDocument): DataClipDocument {
  const matrix = [document.columns.map((column) => column.name), ...document.rows];
  const transposed = Array.from({ length: matrix[0].length }, (_, columnIndex) => matrix.map((row) => row[columnIndex] ?? ""));
  const next = createDataDocument(transposed, true);
  next.views = document.views.map((oldView, index) => {
    const view = createDataView(next.columns, next.rows.length, oldView.name || `ビュー${index + 1}`);
    view.visualization.title = oldView.visualization.title;
    view.visualization.unit = oldView.visualization.unit;
    return view;
  });
  const defaultIndex = Math.max(0, document.views.findIndex((view) => view.id === document.defaultViewId));
  next.defaultViewId = next.views[defaultIndex]?.id ?? next.views[0].id;
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

export function selectedRows(document: DataClipDocument, view = getDefaultView(document)) {
  const selection = normalizeSelection(view.selection, document.rows.length, document.columns.length);
  return document.rows.slice(selection.rowStart, selection.rowEnd + 1);
}
export function selectedColumns(document: DataClipDocument, view = getDefaultView(document)) {
  const selection = normalizeSelection(view.selection, document.rows.length, document.columns.length);
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

export function validateVisualization(document: DataClipDocument, view: DataClipView): string | null {
  const { visualization } = view;
  if (visualization.type === "table") return null;
  const columns = selectedColumns(document, view);
  const selectedIds = new Set(columns.map((column) => column.id));
  const numericIds = new Set(columns.filter((column) => column.type === "number").map((column) => column.id));
  if (visualization.type === "line" || visualization.type === "bar") {
    if (!visualization.xColumnId || !selectedIds.has(visualization.xColumnId)) return `${view.name}: 選択範囲内のX軸を指定してください。`;
    if (visualization.yColumnIds.length === 0 || visualization.yColumnIds.some((id) => !numericIds.has(id))) return `${view.name}: 選択範囲内の数値列を指定してください。`;
  }
  if (visualization.type === "scatter" && (!visualization.xColumnId || !numericIds.has(visualization.xColumnId) || visualization.yColumnIds.length !== 1 || !numericIds.has(visualization.yColumnIds[0]))) return `${view.name}: 数値のX軸とY軸を1列ずつ指定してください。`;
  if (visualization.type === "kpi" && (visualization.yColumnIds.length !== 1 || !numericIds.has(visualization.yColumnIds[0]))) return `${view.name}: KPIの数値列を1つ指定してください。`;
  const plottedIds = visualization.type === "scatter" || visualization.type === "kpi" ? visualization.yColumnIds.slice(0, 1) : visualization.yColumnIds;
  const hasValue = plottedIds.some((id) => {
    const index = document.columns.findIndex((column) => column.id === id);
    return selectedRows(document, view).some((row) => parseNumber(row[index] ?? "") !== null);
  });
  return hasValue ? null : `${view.name}: 選択範囲に描画できる数値がありません。`;
}

export function validateAllVisualizations(document: DataClipDocument) { return document.views.map((view) => validateVisualization(document, view)).find(Boolean) ?? null; }
export function cloneDocument(document: DataClipDocument): DataClipDocument { return structuredClone(document); }
