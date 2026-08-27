import { lazy, Suspense } from "react";
import { Spinner } from "react-bootstrap";

export type MarkdownClipEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const PlateMarkdownEditor = lazy(() => import("./PlateMarkdownEditor"));

export function MarkdownClipEditor(props: MarkdownClipEditorProps) {
  return (
    <Suspense fallback={<div className="markdown-editor-loading"><Spinner size="sm" /> エディタを準備中…</div>}>
      <PlateMarkdownEditor {...props} />
    </Suspense>
  );
}
