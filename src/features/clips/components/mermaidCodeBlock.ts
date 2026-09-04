import { NodeApi } from "platejs";
import type { TCodeBlockElement } from "platejs";

/** Plateのcode_line配列を、Mermaidが解釈できる改行付きソースへ戻す。 */
export function getMermaidCodeBlockSource(element: TCodeBlockElement) {
  return element.children.map((line) => NodeApi.string(line)).join("\n");
}
