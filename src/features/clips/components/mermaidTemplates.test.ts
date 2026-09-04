import { describe, expect, it } from "vitest";
import { isMermaidLanguage, MERMAID_TEMPLATES } from "./mermaidTemplates";

describe("Mermaid templates", () => {
  it("6種類の一意なテンプレートを提供する", () => {
    expect(MERMAID_TEMPLATES).toHaveLength(6);
    expect(new Set(MERMAID_TEMPLATES.map((template) => template.id)).size).toBe(6);
    expect(MERMAID_TEMPLATES.every((template) => template.source.trim().length > 0)).toBe(true);
  });

  it.each([
    ["flow-vertical", "flowchart TD"],
    ["flow-horizontal", "flowchart LR"],
    ["flow-branch", "flowchart TD"],
    ["gantt", "gantt"],
    ["sequence", "sequenceDiagram"],
    ["mindmap", "mindmap"],
  ])("%sは期待するMermaid宣言で始まる", (id, declaration) => {
    expect(MERMAID_TEMPLATES.find((template) => template.id === id)?.source).toMatch(new RegExp(`^${declaration}`));
  });

  it("言語名は大文字小文字を区別せず判定する", () => {
    expect(isMermaidLanguage("mermaid")).toBe(true);
    expect(isMermaidLanguage("MERMAID")).toBe(true);
    expect(isMermaidLanguage("typescript")).toBe(false);
  });
});
