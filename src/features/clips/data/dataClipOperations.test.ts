import { describe, expect, it } from "vitest";
import { createDataDocument } from "./dataClipModel";
import { pasteInsertColumns, pasteInsertRows, pasteOverCells, viewSelectionFromGrid } from "./dataClipOperations";

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
  it("セル貼り付けでビュー範囲とY軸を変更しない", () => {
    const original = salesDocument();
    const selection = structuredClone(original.views[0].selection);
    const yColumnIds = [...original.views[0].visualization.yColumnIds];
    const result = pasteOverCells(original, 1, 1, "300");
    expect(result.document.views[0].selection).toEqual(selection);
    expect(result.document.views[0].visualization.yColumnIds).toEqual(yColumnIds);
    expect(result.document.rows[1][1]).toBe("300");
  });

  it("空の文字列列へ数値を貼り付けると数値型へ昇格する", () => {
    const original = salesDocument();
    original.columns.push({ id: "empty", name: "予算", type: "string" });
    original.rows.forEach((row) => row.push(""));
    original.views[0].selection.columnEnd = 2;
    const result = pasteOverCells(original, 0, 2, "10\n20");
    expect(result.document.columns[2].type).toBe("number");
  });

  it("行貼り付けは選択位置の前へ挿入してビュー範囲を拡張する", () => {
    const result = pasteInsertRows(salesDocument(), 1, "2026-08-03\t300\n2026-08-04\t400");
    expect(result.document.rows).toEqual([
      ["2026-08-01", "100"], ["2026-08-03", "300"], ["2026-08-04", "400"], ["2026-08-02", "200"],
    ]);
    expect(result.document.views[0].selection.rowEnd).toBe(3);
    expect(result.selection.mode).toBe("rows");
  });

  it("列貼り付けは先頭行を列名として型を推論する", () => {
    const result = pasteInsertColumns(salesDocument(), 1, "予算\t件数\n80\t2\n160\t3");
    expect(result.document.columns.map((column) => column.name)).toEqual(["日付", "予算", "件数", "売上"]);
    expect(result.document.columns.slice(1, 3).map((column) => column.type)).toEqual(["number", "number"]);
    expect(result.document.rows[0]).toEqual(["2026-08-01", "80", "2", "100"]);
    expect(result.document.views[0].visualization.yColumnIds).toEqual([result.document.columns[3].id]);
  });

  it("行・列選択をビュー範囲へ変換する", () => {
    const document = salesDocument();
    expect(viewSelectionFromGrid({ mode: "columns", rowStart: 0, rowEnd: 0, columnStart: 1, columnEnd: 1 }, document)).toEqual({ rowStart: 0, rowEnd: 1, columnStart: 1, columnEnd: 1 });
  });
});
