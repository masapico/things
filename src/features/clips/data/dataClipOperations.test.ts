import { describe, expect, it } from "vitest";
import { createDataDocument } from "./dataClipModel";
import { pasteOverSelection, viewSelectionFromGrid } from "./dataClipOperations";

function salesDocument() {
  const document = createDataDocument([
    ["日付", "売上"],
    ["2026-08-01", "100"],
    ["2026-08-02", "200"],
  ], true);
  document.views[0].visualization = { type: "line", title: "", xColumnId: document.columns[0].id, yColumnIds: [document.columns[1].id], unit: "円", kpiAggregation: "latest" };
  return document;
}

describe("data clip table operations", () => {
  it("選択行へ同じ大きさのデータを反映し、表構造とビューを変更しない", () => {
    const original = salesDocument();
    original.rows.push(["", ""]);
    original.rows.push(["", ""]);
    original.views[0].selection.rowEnd = 3;
    const selection = structuredClone(original.views[0].selection);
    const yColumnIds = [...original.views[0].visualization.yColumnIds];
    const columnIds = original.columns.map((column) => column.id);
    const result = pasteOverSelection(original, { mode: "rows", rowStart: 2, rowEnd: 3, columnStart: 0, columnEnd: 1 }, "2026-08-03\t300\n2026-08-04\t400");
    expect(result.rows).toEqual([
      ["2026-08-01", "100"], ["2026-08-02", "200"], ["2026-08-03", "300"], ["2026-08-04", "400"],
    ]);
    expect(result.columns.map((column) => column.id)).toEqual(columnIds);
    expect(result.views[0].selection).toEqual(selection);
    expect(result.views[0].visualization.yColumnIds).toEqual(yColumnIds);
  });

  it("選択列へ先頭行を含む値を反映し、列名を維持して型を推論する", () => {
    const original = salesDocument();
    original.columns.push({ id: "empty", name: "予算", type: "string" });
    original.rows.forEach((row) => row.push(""));
    original.views[0].selection.columnEnd = 2;
    const result = pasteOverSelection(original, { mode: "columns", rowStart: 0, rowEnd: 1, columnStart: 2, columnEnd: 2 }, "10\n20");
    expect(result.rows).toEqual([["2026-08-01", "100", "10"], ["2026-08-02", "200", "20"]]);
    expect(result.columns[2]).toMatchObject({ id: "empty", name: "予算", type: "number" });
  });

  it("選択範囲と行数が異なるデータを拒否する", () => {
    const original = salesDocument();
    expect(() => pasteOverSelection(original, { mode: "rows", rowStart: 0, rowEnd: 0, columnStart: 0, columnEnd: 1 }, "A\t1\nB\t2"))
      .toThrow("選択範囲は1行 × 2列です。貼り付けデータは2行 × 2列でした。");
    expect(original.rows).toEqual([["2026-08-01", "100"], ["2026-08-02", "200"]]);
  });

  it("選択範囲と列数が異なるデータや列数が不揃いなデータを拒否する", () => {
    const original = salesDocument();
    const selection = { mode: "columns", rowStart: 0, rowEnd: 1, columnStart: 0, columnEnd: 0 } as const;
    expect(() => pasteOverSelection(original, selection, "A\t1\nB\t2")).toThrow("2行 × 1列");
    expect(() => pasteOverSelection(original, selection, "A\nB\t2")).toThrow("列数が不揃い");
  });

  it("セル選択への貼り付けを拒否する", () => {
    expect(() => pasteOverSelection(salesDocument(), { mode: "cells", rowStart: 0, rowEnd: 0, columnStart: 0, columnEnd: 0 }, "A"))
      .toThrow("行番号または列記号");
  });

  it("行・列選択をビュー範囲へ変換する", () => {
    const document = salesDocument();
    expect(viewSelectionFromGrid({ mode: "columns", rowStart: 0, rowEnd: 0, columnStart: 1, columnEnd: 1 }, document)).toEqual({ rowStart: 0, rowEnd: 1, columnStart: 1, columnEnd: 1 });
  });
});
