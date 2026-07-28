import { useState, useEffect } from "react";
import { Button, Form, Modal, Stack } from "react-bootstrap";
import { Copy } from "lucide-react";
import type { ProjectsResponse } from "../../../lib/pb_types";
import { useDuplicateProject } from "../hooks/useProjects";
import "./TaskEditModal.css";

type ProjectDuplicateModalProps = {
  project: ProjectsResponse;
  taskCount: number;
  show: boolean;
  onClose: () => void;
  onDuplicated: (newProjectId: string) => void;
};

export function ProjectDuplicateModal({
  project,
  taskCount,
  show,
  onClose,
  onDuplicated,
}: ProjectDuplicateModalProps) {
  const duplicateProject = useDuplicateProject();

  const [name, setName] = useState("");
  const [memo, setMemo] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (show) {
      setName(`${project.name} のコピー`);
      setMemo(project.memo ?? "");
      setStartDate("");
      setEndDate("");
    }
  }, [show, project]);

  function handleSave() {
    if (!name.trim()) return;
    duplicateProject.mutate(
      {
        sourceProjectId: project.id,
        input: {
          name: name.trim(),
          memo: memo.trim() || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      },
      {
        onSuccess: (newProject) => {
          onDuplicated(newProject.id);
        },
      },
    );
  }

  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      size="lg"
      className="task-edit-modal"
    >
      <Modal.Header closeButton className="task-edit-modal-header">
        <div className="task-edit-header-row w-100">
          <div className="task-edit-header-icon">
            <Copy size={20} />
          </div>
          <div>
            <Modal.Title className="task-edit-title">
              プロジェクトを複製
            </Modal.Title>
            <p className="task-edit-subtitle">
              {taskCount} 件のタスクもコピーされます（ステータスは Inbox
              にリセットされます）。
            </p>
          </div>
        </div>
      </Modal.Header>
      <Modal.Body>
        <Form>
          {/* プロジェクト名 */}
          <Form.Group className="mb-3">
            <Form.Label className="task-edit-field-label">
              プロジェクト名
            </Form.Label>
            <Form.Control
              className="task-edit-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="プロジェクト名"
            />
          </Form.Group>

          {/* メモ */}
          <Form.Group className="mb-3">
            <Form.Label className="task-edit-field-label">メモ</Form.Label>
            <Form.Control
              className="task-edit-textarea"
              as="textarea"
              rows={3}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="メモを入力（任意）"
            />
          </Form.Group>

          {/* 開始日・終了日 */}
          <Stack direction="horizontal" gap={3} className="mb-3">
            <Form.Group style={{ flex: 1 }}>
              <Form.Label className="task-edit-field-label">開始日</Form.Label>
              <Form.Control
                className="task-edit-input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Form.Group>
            <Form.Group style={{ flex: 1 }}>
              <Form.Label className="task-edit-field-label">終了日</Form.Label>
              <Form.Control
                className="task-edit-input"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Form.Group>
          </Stack>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <div className="ms-auto d-flex gap-2">
          <Button className="task-edit-btn-cancel" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            className="task-edit-btn-save"
            onClick={handleSave}
            disabled={!name.trim() || duplicateProject.isPending}
          >
            {duplicateProject.isPending ? "複製中…" : "複製"}
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
