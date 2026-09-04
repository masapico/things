import { createContext, useContext, useMemo, useState } from "react";
import { Alert, Button, ButtonGroup, Form } from "react-bootstrap";
import { BoldIcon, BracesIcon, CheckSquareIcon, CodeIcon, Heading1Icon, Heading2Icon, ItalicIcon, ListIcon, ListOrderedIcon, PencilIcon, QuoteIcon, StrikethroughIcon, Trash2Icon, WorkflowIcon } from "lucide-react";
import { BaseBlockquotePlugin, BaseBoldPlugin, BaseCodePlugin, BaseH1Plugin, BaseH2Plugin, BaseItalicPlugin, BaseStrikethroughPlugin } from "@platejs/basic-nodes";
import { insertEmptyCodeBlock, setCodeBlockContent } from "@platejs/code-block";
import { CodeBlockPlugin, CodeLinePlugin } from "@platejs/code-block/react";
import { IndentPlugin } from "@platejs/indent/react";
import { BulletedListRules, getListAbove, indentList, isOrderedList, ListStyleType, OrderedListRules, outdentList, TaskListRules, toggleList } from "@platejs/list";
import { ListPlugin } from "@platejs/list/react";
import { BaseLinkPlugin } from "@platejs/link";
import { deserializeMd, MarkdownPlugin, serializeMd } from "@platejs/markdown";
import { KEYS } from "platejs";
import type { TCodeBlockElement } from "platejs";
import { ParagraphPlugin, Plate, PlateContent, PlateElement, PlateLeaf, usePlateEditor } from "platejs/react";
import type { PlateElementProps, RenderNodeWrapperProps } from "platejs/react";
import remarkGfm from "remark-gfm";
import { MermaidDiagram } from "./MermaidDiagram";
import { MermaidEditorModal } from "./MermaidEditorModal";
import { getMermaidCodeBlockSource } from "./mermaidCodeBlock";
import { isMermaidLanguage } from "./mermaidTemplates";
import type { MarkdownClipEditorProps } from "./MarkdownClipEditor";
import "./PlateMarkdownEditor.css";

const hasRawHtml = (value: string) => /<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^>]*)?>/.test(value);

type MermaidBlockActions = {
  edit: (element: TCodeBlockElement) => void;
  remove: (element: TCodeBlockElement) => void;
};

const MermaidBlockContext = createContext<MermaidBlockActions | null>(null);

function MarkdownCodeLine(props: PlateElementProps) {
  return <PlateElement {...props} as="div" />;
}

function MarkdownCodeBlock(props: PlateElementProps<TCodeBlockElement>) {
  const actions = useContext(MermaidBlockContext);
  const { element } = props;

  if (!isMermaidLanguage(element.lang)) {
    return <PlateElement {...props} as="pre" className="markdown-code-block"><code>{props.children}</code></PlateElement>;
  }

  const source = getMermaidCodeBlockSource(element);
  return (
    <PlateElement {...props} as="div" className="markdown-mermaid-block">
      <div className="markdown-mermaid-toolbar" contentEditable={false}>
        <span>Mermaid</span>
        <ButtonGroup size="sm">
          <Button
            variant="outline-secondary"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => actions?.edit(element)}
          >
            <PencilIcon size={13} /> 編集
          </Button>
          <Button
            variant="outline-danger"
            aria-label="Mermaid図を削除"
            title="Mermaid図を削除"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => actions?.remove(element)}
          >
            <Trash2Icon size={13} /> 削除
          </Button>
        </ButtonGroup>
      </div>
      <div className="mermaid-diagram-shell" contentEditable={false}>
        <MermaidDiagram source={source} />
      </div>
      <details className="markdown-mermaid-source" contentEditable={false}>
        <summary>Mermaidコード</summary>
        <pre><code>{props.children}</code></pre>
      </details>
    </PlateElement>
  );
}

const renderList = (props: RenderNodeWrapperProps) => {
  const { element, editor, path } = props;
  const listStyleType = element.listStyleType as string | undefined;
  if (!listStyleType) return;

  return ({ children }: { children: React.ReactNode }) => {
    if (listStyleType === KEYS.listTodo) {
      return (
        <ul className="markdown-todo-list">
          <li className="markdown-todo-item">
            <input
              type="checkbox"
              checked={Boolean(element.checked)}
              contentEditable={false}
              aria-label="チェック項目を切り替え"
              onMouseDown={(event) => event.preventDefault()}
              onChange={(event) => editor.tf.setNodes({ checked: event.target.checked }, { at: path })}
            />
            {children}
          </li>
        </ul>
      );
    }

    const List = isOrderedList(element) ? "ol" : "ul";
    return <List style={{ listStyleType, margin: 0, padding: 0 }} start={element.listStart as number | undefined}><li>{children}</li></List>;
  };
};

const markdownEditorPlugins = [
  ParagraphPlugin,
  BaseH1Plugin.withComponent((props) => <PlateElement {...props} as="h1" />),
  BaseH2Plugin.withComponent((props) => <PlateElement {...props} as="h2" />),
  BaseBlockquotePlugin.withComponent((props) => <PlateElement {...props} as="blockquote" />),
  BaseBoldPlugin.withComponent((props) => <PlateLeaf {...props} as="strong" />),
  BaseItalicPlugin.withComponent((props) => <PlateLeaf {...props} as="em" />),
  BaseStrikethroughPlugin.withComponent((props) => <PlateLeaf {...props} as="s" />),
  BaseCodePlugin.withComponent((props) => <PlateLeaf {...props} as="code" />),
  CodeBlockPlugin.withComponent(MarkdownCodeBlock),
  CodeLinePlugin.withComponent(MarkdownCodeLine),
  IndentPlugin.configure({ inject: { targetPlugins: [KEYS.p] } }),
  ListPlugin.configure({
    inputRules: [
      BulletedListRules.markdown({ variant: "-" }),
      BulletedListRules.markdown({ variant: "*" }),
      OrderedListRules.markdown({ variant: "." }),
      TaskListRules.markdown({ checked: false }),
      TaskListRules.markdown({ checked: true }),
    ],
    render: { belowNodes: renderList },
  }),
  BaseLinkPlugin,
  MarkdownPlugin.configure({ options: { remarkPlugins: [remarkGfm] } }),
];

export default function PlateMarkdownEditor({ value, onChange, placeholder = "Markdownを入力" }: MarkdownClipEditorProps) {
  const unsafe = hasRawHtml(value);
  const [mode, setMode] = useState<"visual" | "source">(() => unsafe ? "source" : "visual");
  const editor = usePlateEditor({ plugins: markdownEditorPlugins, value: (editor) => deserializeMd(editor, value || "") });
  const sourceWarning = useMemo(() => hasRawHtml(value), [value]);
  const [diagramEditor, setDiagramEditor] = useState<{ element: TCodeBlockElement | null; source: string } | null>(null);

  const switchMode = (next: "visual" | "source") => {
    if (next === "visual" && sourceWarning) return;
    if (next === "visual") editor.tf.setValue(deserializeMd(editor, value || ""));
    else onChange(serializeMd(editor));
    setMode(next);
  };
  const toggleMark = (key: string) => { editor.tf.toggleMark(key); editor.tf.focus(); };
  const toggleBlock = (key: string) => { editor.tf.toggleBlock(key); editor.tf.focus(); };
  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const listEntry = getListAbove(editor);
    if (!listEntry) return;

    event.preventDefault();
    const listStyleType = listEntry[0].listStyleType as string;
    if (event.shiftKey) outdentList(editor, { listStyleType });
    else indentList(editor, { listStyleType });
  };

  const saveDiagram = (source: string) => {
    if (diagramEditor?.element) {
      const path = editor.api.findPath(diagramEditor.element);
      if (path) {
        setCodeBlockContent(editor, { element: diagramEditor.element, code: source });
        editor.tf.setNodes({ lang: "mermaid" }, { at: path });
      }
    } else {
      insertEmptyCodeBlock(editor);
      const entry = editor.api.above<TCodeBlockElement>({ match: { type: editor.getType(KEYS.codeBlock) } });
      if (entry) {
        setCodeBlockContent(editor, { element: entry[0], code: source });
        editor.tf.setNodes({ lang: "mermaid" }, { at: entry[1] });
      }
    }
    setDiagramEditor(null);
    editor.tf.focus();
  };

  const removeDiagram = (element: TCodeBlockElement) => {
    if (!window.confirm("このMermaid図を削除しますか？")) return;

    const path = editor.api.findPath(element);
    if (!path) return;

    editor.tf.removeNodes({ at: path });
    if (editor.children.length === 0) {
      editor.tf.insertNodes({ type: editor.getType(KEYS.p), children: [{ text: "" }] });
    }
    editor.tf.focus();
  };

  return <MermaidBlockContext.Provider value={{
    edit: (element) => setDiagramEditor({ element, source: getMermaidCodeBlockSource(element) }),
    remove: removeDiagram,
  }}><div className="markdown-clip-editor">
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
          <Button variant="outline-secondary" title="チェックリスト" onMouseDown={(event) => { event.preventDefault(); toggleList(editor, { listStyleType: KEYS.listTodo }); editor.tf.focus(); }}><CheckSquareIcon size={15} /></Button>
        </ButtonGroup>
        <Button size="sm" variant="outline-secondary" title="Mermaid図を作成" onMouseDown={(event) => { event.preventDefault(); setDiagramEditor({ element: null, source: "" }); }}><WorkflowIcon size={15} /> 図</Button>
      </>}
    </div>
    {sourceWarning && <Alert variant="warning" className="markdown-editor-warning">HTMLを含むため、内容を壊さないMarkdownモードで編集します。</Alert>}
    {mode === "source" ? <Form.Control as="textarea" rows={14} className="clip-pad-textarea markdown-source" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /> :
      <Plate editor={editor} onValueChange={() => onChange(serializeMd(editor))}><PlateContent className="markdown-plate-content clip-markdown-body" placeholder={placeholder} onKeyDown={handleEditorKeyDown} /></Plate>}
    {diagramEditor ? <MermaidEditorModal initialSource={diagramEditor.element ? diagramEditor.source : null} onClose={() => setDiagramEditor(null)} onSave={saveDiagram} /> : null}
  </div></MermaidBlockContext.Provider>;
}
