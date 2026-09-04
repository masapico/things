import { isValidElement, type ComponentProps, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidDiagram } from "./MermaidDiagram";
import { isMermaidLanguage } from "./mermaidTemplates";

function MarkdownPre({ children, ...props }: ComponentProps<"pre">) {
  if (isValidElement<{ className?: string; children?: ReactNode }>(children)) {
    const language = children.props.className?.match(/language-([^\s]+)/)?.[1];
    if (isMermaidLanguage(language)) {
      const source = String(children.props.children ?? "").replace(/\n$/, "");
      return (
        <div className="markdown-mermaid-block">
          <div className="mermaid-diagram-shell"><MermaidDiagram source={source} /></div>
          <details className="markdown-mermaid-source">
            <summary>Mermaidコード</summary>
            <pre><code>{source}</code></pre>
          </details>
        </div>
      );
    }
  }
  return <pre {...props}>{children}</pre>;
}

export function MarkdownWithMermaid({ children }: { children: string }) {
  return <Markdown remarkPlugins={[remarkGfm]} components={{ pre: MarkdownPre }}>{children}</Markdown>;
}
