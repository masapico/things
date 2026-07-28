import { useState } from "react";
import { Button, Form, Modal, Stack } from "react-bootstrap";
import type { ClipsResponse } from "../../../lib/pb_types";
import { PlusIcon } from "lucide-react";
import { ClipSelector } from "../../../components/ClipSelector";
import { ClipDetailModal } from "../../clips/components/ClipDetailModal";
import { pb } from "../../../lib/pocketbase";
import { useQueryClient } from "@tanstack/react-query";
import "./TaskEditModal.css";

type ProjectCreateModalProps = {
  show: boolean;
  onClose: () => void;
};

export function ProjectCreateModal({ show, onClose }: ProjectCreateModalProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [memo, setMemo] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedClips, setSelectedClips] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // ClipDetailModal 用
  const [viewingClip, setViewingClip] = useState<ClipsResponse | null>(null);
  const [showClipDetail, setShowClipDetail] = useState(false);

  // モーダルが開かれたタイミングでフォームをリセットする
  // (レンダー中の状態調整パターン: https://react.dev/learn/you-might-not-need-an-effect)
  const [prevShow, setPrevShow] = useState(show);
  if (show !== prevShow) {
    setPrevShow(show);
    if (show) {
      setName("");
      setMemo("");
      setStartDate("");
      setEndDate("");
      setIsActive(true);
      setSelectedClips([]);
    }
  }

  async function handleSave() {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await pb.collection("projects").create({
        name: name.trim(),
        memo: memo.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        isActive,
        clips: selectedClips,
      });
      queryClient.invalidateQueries({ queryKey: ["activeProjects"] });
      queryClient.invalidateQueries({ queryKey: ["archivedProjects"] });
      onClose();
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
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
              <PlusIcon size={20} />
            </div>
            <div>
              <Modal.Title className="task-edit-title">
                プロジェクトを新規作成
              </Modal.Title>
              <p className="task-edit-subtitle">
                新しいプロジェクトの情報を入力してください。
              </p>
            </div>
            <span className="task-edit-status-badge">
              {isActive ? "Active" : "Archived"}
            </span>
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
                <Form.Label className="task-edit-field-label">
                  開始日
                </Form.Label>
                <Form.Control
                  className="task-edit-input"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Form.Group>
              <Form.Group style={{ flex: 1 }}>
                <Form.Label className="task-edit-field-label">
                  終了日
                </Form.Label>
                <Form.Control
                  className="task-edit-input"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Form.Group>
            </Stack>

            {/* アクティブ状態 */}
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="project-create-is-active"
                label="アクティブ"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
            </Form.Group>

            {/* クリップ */}
            <Form.Group className="mb-3">
              <Form.Label className="task-edit-field-label">
                クリップ
              </Form.Label>
              <ClipSelector
                selectedClipIds={selectedClips}
                onChange={setSelectedClips}
                onClipClick={(clip) => {
                  setViewingClip(clip);
                  setShowClipDetail(true);
                }}
              />
            </Form.Group>
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
              disabled={!name.trim() || isSaving}
            >
              {isSaving ? "作成中…" : "作成"}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Clip Detail Modal */}
      {viewingClip && (
        <ClipDetailModal
          clip={viewingClip}
          show={showClipDetail}
          onClose={() => setShowClipDetail(false)}
        />
      )}
    </>
  );
}