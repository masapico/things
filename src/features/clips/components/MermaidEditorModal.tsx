import { useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { MermaidDiagram, type MermaidRenderStatus } from "./MermaidDiagram";
import { MERMAID_TEMPLATES } from "./mermaidTemplates";

type Props = {
  initialSource: string | null;
  onClose: () => void;
  onSave: (source: string) => void;
};

export function MermaidEditorModal({ initialSource, onClose, onSave }: Props) {
  const isEditing = initialSource !== null;
  const [selectedTemplate, setSelectedTemplate] = useState(MERMAID_TEMPLATES[0].id);
  const [source, setSource] = useState(initialSource ?? MERMAID_TEMPLATES[0].source);
  const [renderStatus, setRenderStatus] = useState<MermaidRenderStatus>("idle");

  return (
    <Modal show onHide={onClose} size="xl" centered onKeyDown={(event: React.KeyboardEvent) => event.stopPropagation()}>
      <Modal.Header closeButton>
        <Modal.Title>{isEditing ? "Mermaid図を編集" : "Mermaid図を作成"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mermaid-editor-layout">
          {!isEditing ? (
            <div className="mermaid-template-list" aria-label="図のテンプレート">
              {MERMAID_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={`mermaid-template-button${selectedTemplate === template.id ? " is-selected" : ""}`}
                  onClick={() => {
                    setSelectedTemplate(template.id);
                    setSource(template.source);
                    setRenderStatus("idle");
                  }}
                >
                  <strong>{template.name}</strong>
                  <span>{template.description}</span>
                </button>
              ))}
            </div>
          ) : null}
          <div>
            <Form.Label>Mermaidコード</Form.Label>
            <Form.Control
              as="textarea"
              className="mermaid-source"
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
                setRenderStatus("idle");
              }}
              spellCheck={false}
              autoFocus
            />
            <div className="mermaid-preview-title">プレビュー</div>
            <div className="mermaid-diagram-shell">
              <MermaidDiagram source={source} delay={250} onStatusChange={setRenderStatus} />
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>キャンセル</Button>
        <Button onClick={() => onSave(source.trim())} disabled={!source.trim() || renderStatus !== "ready"}>
          {isEditing ? "図を更新" : "図を挿入"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
