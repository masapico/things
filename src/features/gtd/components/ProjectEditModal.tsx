import { useState, useEffect } from "react";
import { Button, Form, Modal, Stack } from "react-bootstrap";
import type { ProjectsResponse, ClipsResponse } from "../../../lib/pb_types";
import { PenLineIcon } from "lucide-react";
import { ClipSelector } from "../../../components/ClipSelector";
import { ClipDetailModal } from "../../clips/components/ClipDetailModal";
import { pb } from "../../../lib/pocketbase";
import { useQueryClient } from "@tanstack/react-query";
import "./TaskEditModal.css";

type ProjectEditModalProps = {
  project: ProjectsResponse;
  show: boolean;
  onClose: () => void;
};

/** PocketBase の ISO 日付文字列を <input type="date"> 用の YYYY-MM-DD 形式に変換 */
function toDateInputValue(isoString?: string): string {
  if (!isoString) return "";
  const match = isoString.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

export function ProjectEditModal({
  project,
  show,
  onClose,
}: ProjectEditModalProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState(project.name);
  const [memo, setMemo] = useState(project.memo ?? "");
  const [startDate, setStartDate] = useState(toDateInputValue(project.startDate));
  const [endDate, setEndDate] = useState(toDateInputValue(project.endDate));
  const [isActive, setIsActive] = useState(project.isActive ?? true);
  const [selectedClips, setSelectedClips] = useState<string[]>(
    project.clips ?? [],
  );
  const [isSaving, setIsSaving] = useState(false);

  // ClipDetailModal 用
  const [viewingClip, setViewingClip] = useState<ClipsResponse | null>(null);
  const [showClipDetail, setShowClipDetail] = useState(false);

  useEffect(() => {
    if (show) {
      Promise.resolve().then(() => {
        setName(project.name);
        setMemo(project.memo ?? "");
        setStartDate(toDateInputValue(project.startDate));
        setEndDate(toDateInputValue(project.endDate));
        setIsActive(project.isActive ?? true);
        setSelectedClips(project.clips ?? []);
      });
    }
  }, [show, project]);

  async function handleSave() {
    setIsSaving(true);
    try {
      await pb.collection("projects").update(project.id, {
        name: name.trim() || undefined,
        memo: memo.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        isActive,
        clips: selectedClips,
      });
      queryClient.invalidateQueries({ queryKey: ["activeProjects"] });
      queryClient.invalidateQueries({ queryKey: ["archivedProjects"] });
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      onClose();
    } catch (err) {
      console.error("Failed to update project:", err);
    } finally {
      setIsSaving(false);
    }
  }

  const hasChanges =
    name !== project.name ||
    memo !== (project.memo ?? "") ||
    startDate !== toDateInputValue(project.startDate) ||
    endDate !== toDateInputValue(project.endDate) ||
    isActive !== (project.isActive ?? true) ||
    JSON.stringify(selectedClips.sort()) !==
      JSON.stringify((project.clips ?? []).sort());

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
              <PenLineIcon size={20} />
            </div>
            <div>
              <Modal.Title className="task-edit-title">
                プロジェクトを編集
              </Modal.Title>
              <p className="task-edit-subtitle">
                内容を変更して保存してください。
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
                id="project-is-active"
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
              disabled={!name.trim() || !hasChanges || isSaving}
            >
              {isSaving ? "保存中…" : "保存"}
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