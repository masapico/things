import { describe, expect, it } from "vitest";
import { calculateKpi, createDataDocument, inferColumnType, normalizeSelection, transposeDataDocument } from "./dataClipModel";

describe("data clip model", () => {
  it("見出しと列型を推定して文書を作成する", () => {
    const document = createDataDocument([["日付", "売上"], ["2026-08-01", "1,200"], ["2026-08-02", "1500"]], true);
    expect(document.columns.map((column) => column.type)).toEqual(["date", "number"]);
    expect(document.rows).toHaveLength(2);
    expect(document.selection).toEqual({ rowStart: 0, rowEnd: 1, columnStart: 0, columnEnd: 1 });
  });

  it("列内に解釈できない値があれば文字列とする", () => {
    expect(inferColumnType(["10", "不明"])).toBe("string");
  });

  it("選択範囲を表サイズ内へ補正する", () => {
    expect(normalizeSelection({ rowStart: 5, rowEnd: -2, columnStart: 8, columnEnd: 1 }, 3, 4)).toEqual({ rowStart: 0, rowEnd: 2, columnStart: 1, columnEnd: 3 });
  });

  it("KPIを集計する", () => {
    const values = ["1", "", "3", "2"];
    expect(calculateKpi(values, "latest")).toBe(2);
    expect(calculateKpi(values, "sum")).toBe(6);
    expect(calculateKpi(values, "average")).toBe(2);
    expect(calculateKpi(values, "min")).toBe(1);
    expect(calculateKpi(values, "max")).toBe(3);
    expect(calculateKpi(values, "count")).toBe(3);
  });

  it("見出しを含めて行列を転置し、列型を再推定する", () => {
    const document = createDataDocument([
      ["令和7年度", "4月", "5月"],
      ["A", "173", "4655"],
      ["B", "149", "267"],
    ], true);
    const transposed = transposeDataDocument(document);
    expect(transposed.columns.map((column) => column.name)).toEqual(["令和7年度", "A", "B"]);
    expect(transposed.columns.map((column) => column.type)).toEqual(["string", "number", "number"]);
    expect(transposed.rows).toEqual([["4月", "173", "149"], ["5月", "4655", "267"]]);
    expect(transposed.selection).toEqual({ rowStart: 0, rowEnd: 1, columnStart: 0, columnEnd: 2 });
  });
});
