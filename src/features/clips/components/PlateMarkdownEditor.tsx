import { useMemo, useState } from "react";
import { Alert, Button, ButtonGroup, Form } from "react-bootstrap";
import { BoldIcon, BracesIcon, CodeIcon, Heading1Icon, Heading2Icon, ItalicIcon, ListIcon, ListOrderedIcon, QuoteIcon, StrikethroughIcon } from "lucide-react";
import { BaseBlockquotePlugin, BaseBoldPlugin, BaseCodePlugin, BaseH1Plugin, BaseH2Plugin, BaseItalicPlugin, BaseStrikethroughPlugin } from "@platejs/basic-nodes";
import { ListStyleType, toggleList } from "@platejs/list";
import { ListPlugin } from "@platejs/list/react";
import { BaseLinkPlugin } from "@platejs/link";
import { deserializeMd, MarkdownPlugin, serializeMd } from "@platejs/markdown";
import { ParagraphPlugin, Plate, PlateContent, PlateElement, PlateLeaf, usePlateEditor } from "platejs/react";
import type { MarkdownClipEditorProps } from "./MarkdownClipEditor";
import "./PlateMarkdownEditor.css";

const hasRawHtml = (value: string) => /<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^>]*)?>/.test(value);

const plugins = [
  ParagraphPlugin,
  BaseH1Plugin.withComponent((props) => <PlateElement {...props} as="h1" />),
  BaseH2Plugin.withComponent((props) => <PlateElement {...props} as="h2" />),
  BaseBlockquotePlugin.withComponent((props) => <PlateElement {...props} as="blockquote" />),
  BaseBoldPlugin.withComponent((props) => <PlateLeaf {...props} as="strong" />),
  BaseItalicPlugin.withComponent((props) => <PlateLeaf {...props} as="em" />),
  BaseStrikethroughPlugin.withComponent((props) => <PlateLeaf {...props} as="s" />),
  BaseCodePlugin.withComponent((props) => <PlateLeaf {...props} as="code" />),
  ListPlugin,
  BaseLinkPlugin,
  MarkdownPlugin,
];

export default function PlateMarkdownEditor({ value, onChange, placeholder = "Markdownを入力" }: MarkdownClipEditorProps) {
  const unsafe = hasRawHtml(value);
  const [mode, setMode] = useState<"visual" | "source">(() => unsafe ? "source" : "visual");
  const editor = usePlateEditor({ plugins, value: (editor) => deserializeMd(editor, value || "") });
  const sourceWarning = useMemo(() => hasRawHtml(value), [value]);

  const switchMode = (next: "visual" | "source") => {
    if (next === "visual" && sourceWarning) return;
    if (next === "visual") editor.tf.setValue(deserializeMd(editor, value || ""));
    else onChange(serializeMd(editor));
    setMode(next);
  };
  const toggleMark = (key: string) => { editor.tf.toggleMark(key); editor.tf.focus(); };
  const toggleBlock = (key: string) => { editor.tf.toggleBlock(key); editor.tf.focus(); };

  return <div className="markdown-clip-editor">
    <div className="markdown-editor-toolbar">
      <ButtonGroup size="sm">
        <Button variant={mode === "visual" ? "primary" : "outline-secondary"} onClick={() => switchMode("visual")} disabled={sourceWarning}>ビジュアル</Button>
        <Button variant={mode === "source" ? "primary" : "outline-secondary"} onClick={() => switchMode("source")}><BracesIcon size={14} /> Markdown</Button>
      </ButtonGroup>
      {mode === "visual" && <>
        <ButtonGroup size="sm">
          <Button variant="outline-secondary" title="太字" onMouseDown={(event) => { event.preventDefault(); toggleMark("bold"); }}><BoldIcon size={15} /></Button>
          <Button variant="outline-secondary" title="斜体" onMouseDown={(event) => { event.preventDefault(); toggleMark("italic"); }}><ItalicIcon size={15} /></Button>
          <Button variant="outline-secondary" title="取り消し線" onMouseDown={(event) => { event.preventDefault(); toggleMark("strikethrough"); }}><StrikethroughIcon size={15} /></Button>
          <Button variant="outline-secondary" title="インラインコード" onMouseDown={(event) => { event.preventDefault(); toggleMark("code"); }}><CodeIcon size={15} /></Button>
        </ButtonGroup>
        <ButtonGroup size="sm">
          <Button variant="outline-secondary" title="見出し1" onMouseDown={(event) => { event.preventDefault(); toggleBlock("h1"); }}><Heading1Icon size={15} /></Button>
          <Button variant="outline-secondary" title="見出し2" onMouseDown={(event) => { event.preventDefault(); toggleBlock("h2"); }}><Heading2Icon size={15} /></Button>
          <Button variant="outline-secondary" title="引用" onMouseDown={(event) => { event.preventDefault(); toggleBlock("blockquote"); }}><QuoteIcon size={15} /></Button>
          <Button variant="outline-secondary" title="箇条書き" onMouseDown={(event) => { event.preventDefault(); toggleList(editor, { listStyleType: ListStyleType.Disc }); editor.tf.focus(); }}><ListIcon size={15} /></Button>
          <Button variant="outline-secondary" title="番号付きリスト" onMouseDown={(event) => { event.preventDefault(); toggleList(editor, { listStyleType: ListStyleType.Decimal }); editor.tf.focus(); }}><ListOrderedIcon size={15} /></Button>
        </ButtonGroup>
      </>}
    </div>
    {sourceWarning && <Alert variant="warning" className="markdown-editor-warning">HTMLを含むため、内容を壊さないMarkdownモードで編集します。</Alert>}
    {mode === "source" ? <Form.Control as="textarea" rows={14} className="clip-pad-textarea markdown-source" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /> :
      <Plate editor={editor} onValueChange={() => onChange(serializeMd(editor))}><PlateContent className="markdown-plate-content clip-markdown-body" placeholder={placeholder} /></Plate>}
  </div>;
}
