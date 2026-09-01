import { describe, expect, it } from "vitest";
import { exportCsv, parseDelimitedText } from "./csv";

describe("data clip csv", () => {
  it("TSVを解析する", () => {
    expect(parseDelimitedText("名前\t値\nA\t10")).toEqual([["名前", "値"], ["A", "10"]]);
  });

  it("単一列の貼り付けを解析する", () => {
    expect(parseDelimitedText("10\n20")).toEqual([["10"], ["20"]]);
  });

  it("引用符内のカンマと改行を保持する", () => {
    expect(parseDelimitedText('name,note\nA,"hello,\nworld"')).toEqual([["name", "note"], ["A", "hello,\nworld"]]);
  });

  it("CSV出力時に表計算式の実行を防ぐ", () => {
    const output = exportCsv(["name"], [["=1+1"]]);
    expect(output).toContain("'=1+1");
    expect(output.startsWith("\uFEFF")).toBe(true);
  });
});
