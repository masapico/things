import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANNOTATION_STYLE,
  moveAnnotation,
  parseAnnotationDocument,
  simplifyPath,
} from "./annotationModel";

describe("parseAnnotationDocument", () => {
  it("旧形式の四角配列をV2へ移行する", () => {
    const result = parseAnnotationDocument('[{"x":0.1,"y":0.2,"width":0.3,"height":0.4}]');
    expect(result.version).toBe(2);
    expect(result.items[0]).toMatchObject({
      type: "rect",
      x: 0.1,
      y: 0.2,
      width: 0.3,
      height: 0.4,
      style: DEFAULT_ANNOTATION_STYLE,
    });
  });

  it("不正な入力を安全に空へ変換する", () => {
    expect(parseAnnotationDocument("not-json").items).toEqual([]);
    expect(parseAnnotationDocument({ version: 2, items: [null] }).items).toEqual([]);
  });

  it("座標を画像範囲内へ正規化する", () => {
    const result = parseAnnotationDocument({
      version: 2,
      items: [{ type: "arrow", start: { x: -1, y: 2 }, end: { x: 0.5, y: 0.6 } }],
    });
    expect(result.items[0]).toMatchObject({ start: { x: 0, y: 1 } });
  });
});

describe("simplifyPath", () => {
  it("近すぎる中間点を省いて端点を残す", () => {
    const points = [{ x: 0, y: 0 }, { x: 0.0001, y: 0.0001 }, { x: 1, y: 1 }];
    expect(simplifyPath(points)).toEqual([points[0], points[2]]);
  });
});

describe("moveAnnotation", () => {
  it("四角を画像範囲内で移動する", () => {
    const result = moveAnnotation({
      id: "rect",
      type: "rect",
      x: 0.7,
      y: 0.2,
      width: 0.2,
      height: 0.3,
      style: DEFAULT_ANNOTATION_STYLE,
    }, 0.5, -0.5);
    expect(result).toMatchObject({ x: 0.8, y: 0 });
  });

  it("矢印の形を保ったまま端で移動量を制限する", () => {
    const result = moveAnnotation({
      id: "arrow",
      type: "arrow",
      start: { x: 0.2, y: 0.3 },
      end: { x: 0.8, y: 0.7 },
      style: DEFAULT_ANNOTATION_STYLE,
    }, 0.5, 0.5);
    if (result.type !== "arrow") throw new Error("arrow expected");
    expect(result.start.x).toBeCloseTo(0.4);
    expect(result.start.y).toBeCloseTo(0.6);
    expect(result.end.x).toBeCloseTo(1);
    expect(result.end.y).toBeCloseTo(1);
  });
});
