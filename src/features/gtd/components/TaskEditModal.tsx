import { useState, useEffect } from "react";
import { Button, Form, Modal, Stack } from "react-bootstrap";
import type { TasksResponse, ClipsResponse } from "../../../lib/pb_types";
import { useUpdateTask, useDeleteInboxTask } from "../hooks/useTasks";
import { useActiveProjects } from "../hooks/useProjects";
import type { TasksPriorityOptions } from "../../../lib/pb_types";
import { PenLineIcon, Trash2Icon } from "lucide-react";
import { ClipSelector } from "../../../components/ClipSelector";
import { ClipDetailModal } from "../../clips/components/ClipDetailModal";
import "./TaskEditModal.css";

type TaskEditModalProps = {
  task: TasksResponse;
  show: boolean;
  onClose: () => void;
};

const STATUS_LABELS: Record<string, string> = {
  inbox: "Inbox",
  next: "Next",
  waiting: "Waiting",
  completed: "Done",
  someday: "Someday",
};

/** PocketBase の ISO 日付文字列を <input type="date"> 用の YYYY-MM-DD 形式に変換 */
function toDateInputValue(isoString?: string): string {
  if (!isoString) return "";
  // PocketBase は "2024-01-15 00:00:00.000Z" または "2024-01-15T00:00:00.000Z" 形式で返す
  // 先頭10文字が YYYY-MM-DD であればそれを返す
  const match = isoString.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

export function TaskEditModal({ task, show, onClose }: TaskEditModalProps) {
  const { data: projects = [] } = useActiveProjects();
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteInboxTask();

  const [title, setTitle] = useState(task.title);
  const [memo, setMemo] = useState(task.memo ?? "");
  const [priority, setPriority] = useState<TasksPriorityOptions | "">(
    task.priority ?? "",
  );
  const [duedate, setDuedate] = useState(toDateInputValue(task.duedate));
  const [project, setProject] = useState(task.project ?? "");
  const [selectedClips, setSelectedClips] = useState<string[]>(
    task.clips ?? [],
  );

  // ClipDetailModal 用
  const [viewingClip, setViewingClip] = useState<ClipsResponse | null>(null);
  const [showClipDetail, setShowClipDetail] = useState(false);

  // モーダルが開かれるたびにフォームをリセット
  useEffect(() => {
    if (show) {
      Promise.resolve().then(() => {
        setTitle(task.title);
        setMemo(task.memo ?? "");
        setPriority(task.priority ?? "");
        setDuedate(toDateInputValue(task.duedate));
        setProject(task.project ?? "");
        setSelectedClips(task.clips ?? []);
      });
    }
  }, [show, task]);

  function handleSave() {
    updateMutation.mutate(
      {
        id: task.id,
        title: title.trim() || undefined,
        memo: memo.trim() || null,
        priority: priority || null,
        duedate: duedate || null,
        project: project || null,
        clips: selectedClips,
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  }

  function handleDelete() {
    if (!window.confirm(`「${task.title}」を削除してもよろしいですか？`)) return;
    deleteMutation.mutate(task, {
      onSuccess: () => {
        onClose();
      },
    });
  }

  const hasChanges =
    title !== task.title ||
    memo !== (task.memo ?? "") ||
    priority !== (task.priority ?? "") ||
    duedate !== toDateInputValue(task.duedate) ||
    project !== (task.project ?? "") ||
    JSON.stringify(selectedClips.sort()) !==
      JSON.stringify((task.clips ?? []).sort());

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
                タスクを編集
              </Modal.Title>
              <p className="task-edit-subtitle">
                内容を変更して保存してください。
              </p>
            </div>
            <span className="task-edit-status-badge">
              {STATUS_LABELS[task.status] ?? task.status}
            </span>
          </div>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {/* タイトル */}
            <Form.Group className="mb-3">
              <Form.Label className="task-edit-field-label">
                タイトル
              </Form.Label>
              <Form.Control
                className="task-edit-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="タスク名"
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

            {/* 優先度・期限 */}
            <Stack direction="horizontal" gap={3} className="mb-3">
              <Form.Group style={{ flex: 1 }}>
                <Form.Label className="task-edit-field-label">
                  優先度
                </Form.Label>
                <Form.Select
                  className="task-edit-select"
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as TasksPriorityOptions | "")
                  }
                >
                  <option value="">なし</option>
                  <option value="high">高</option>
                  <option value="low">低</option>
                </Form.Select>
              </Form.Group>
              <Form.Group style={{ flex: 1 }}>
                <Form.Label className="task-edit-field-label">期限</Form.Label>
                <Form.Control
                  className="task-edit-input"
                  type="date"
                  value={duedate}
                  onChange={(e) => setDuedate(e.target.value)}
                />
              </Form.Group>
            </Stack>

            {/* プロジェクト */}
            <Form.Group className="mb-3">
              <Form.Label className="task-edit-field-label">
                プロジェクト
              </Form.Label>
              <Form.Select
                className="task-edit-select"
                value={project}
                onChange={(e) => setProject(e.target.value)}
              >
                <option value="">なし</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Form.Select>
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
          <Button
            className="task-edit-btn-delete"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2Icon size={16} />
            {deleteMutation.isPending ? "削除中…" : "削除"}
          </Button>
          <div className="ms-auto d-flex gap-2">
            <Button className="task-edit-btn-cancel" onClick={onClose}>
              キャンセル
            </Button>
            <Button
              className="task-edit-btn-save"
              onClick={handleSave}
              disabled={!title.trim() || !hasChanges || updateMutation.isPending}
            >
              {updateMutation.isPending ? "保存中…" : "保存"}
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