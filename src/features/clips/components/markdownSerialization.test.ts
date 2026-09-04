import { describe, expect, it } from "vitest";
import { BaseBoldPlugin, BaseH1Plugin, BaseItalicPlugin, BaseStrikethroughPlugin } from "@platejs/basic-nodes";
import { deserializeMd, MarkdownPlugin, serializeMd } from "@platejs/markdown";
import { createPlateEditor, ParagraphPlugin } from "platejs/react";
import { ListPlugin } from "@platejs/list/react";
import { IndentPlugin } from "@platejs/indent/react";
import { CodeBlockPlugin } from "@platejs/code-block/react";
import type { TCodeBlockElement } from "platejs";
import remarkGfm from "remark-gfm";
import { getMermaidCodeBlockSource } from "./mermaidCodeBlock";

describe("Plate Markdown serialization", () => {
  it("主要なMarkdown表現を往復して保持する", () => {
    const markdown = "# 見出し\n\n**太字** と *斜体* と ~~取消~~\n";
    const editor = createPlateEditor({ plugins: [ParagraphPlugin, BaseH1Plugin, BaseBoldPlugin, BaseItalicPlugin, BaseStrikethroughPlugin, MarkdownPlugin] });
    editor.tf.setValue(deserializeMd(editor, markdown));
    const output = serializeMd(editor);
    expect(output).toContain("# 見出し");
    expect(output).toContain("**太字**");
    expect(output).toMatch(/(?:\*|_)斜体(?:\*|_)/);
    expect(output).toContain("~~取消~~");
  });

  it("箇条書きと番号付きリストを往復して保持する", () => {
    const markdown = "- one\n- two\n\n1. first\n2. second\n";
    const editor = createPlateEditor({ plugins: [ParagraphPlugin, ListPlugin, MarkdownPlugin] });
    editor.tf.setValue(deserializeMd(editor, markdown));
    const output = serializeMd(editor);
    expect(output).toMatch(/[*+-] one/);
    expect(output).toMatch(/[*+-] two/);
    expect(output).toContain("1. first");
    expect(output).toContain("2. second");
  });

  it("入れ子の混在リストとチェック状態を往復して保持する", () => {
    const markdown = "- parent\n  1. numbered child\n     - [ ] todo child\n     - [x] done child\n- sibling\n";
    const editor = createPlateEditor({ plugins: [ParagraphPlugin, IndentPlugin, ListPlugin, MarkdownPlugin.configure({ options: { remarkPlugins: [remarkGfm] } })] });
    editor.tf.setValue(deserializeMd(editor, markdown));
    const output = serializeMd(editor);

    expect(output).toMatch(/[*+-] parent/);
    expect(output).toMatch(/\s+1\. numbered child/);
    expect(output).toMatch(/\s+[*+-] \[ \] todo child/);
    expect(output).toMatch(/\s+[*+-] \[x\] done child/i);
    expect(output).toMatch(/[*+-] sibling/);
  });

  it("Mermaidコードブロックの言語と内容を往復して保持する", () => {
    const markdown = "```mermaid\nflowchart TD\n  A --> B\n```\n";
    const editor = createPlateEditor({ plugins: [ParagraphPlugin, CodeBlockPlugin, MarkdownPlugin] });
    editor.tf.setValue(deserializeMd(editor, markdown));

    expect(getMermaidCodeBlockSource(editor.children[0] as TCodeBlockElement)).toBe("flowchart TD\n  A --> B");
    expect(serializeMd(editor)).toContain(markdown.trim());
  });
});
