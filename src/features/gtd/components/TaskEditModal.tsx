import { useState, useEffect } from "react";
import { Button, Form, Modal, Stack } from "react-bootstrap";
import type { TasksResponse, ClipsResponse } from "../../../lib/pb_types";
import { useUpdateTask, useDeleteInboxTask } from "../hooks/useTasks";
import { useActiveProjects } from "../hooks/useProjects";
import { useContexts } from "../../contexts/hooks/useContexts";
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

export function TaskEditModal({ task, show, onClose }: TaskEditModalProps) {
  const { data: projects = [] } = useActiveProjects();
  const { data: contexts = [] } = useContexts();
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteInboxTask();

  const [title, setTitle] = useState(task.title);
  const [memo, setMemo] = useState(task.memo ?? "");
  const [priority, setPriority] = useState<TasksPriorityOptions | "">(
    task.priority ?? "",
  );
  const [duedate, setDuedate] = useState(task.duedate ?? "");
  const [project, setProject] = useState(task.project ?? "");
  const [selectedContexts, setSelectedContexts] = useState<string[]>(
    task.contexts ?? [],
  );
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
        setDuedate(task.duedate ?? "");
        setProject(task.project ?? "");
        setSelectedContexts(task.contexts ?? []);
        setSelectedClips(task.clips ?? []);
      });
    }
  }, [show, task]);

  function handleContextToggle(contextId: string) {
    setSelectedContexts((prev) =>
      prev.includes(contextId)
        ? prev.filter((id) => id !== contextId)
        : [...prev, contextId],
    );
  }

  function handleSave() {
    updateMutation.mutate(
      {
        id: task.id,
        title: title.trim() || undefined,
        memo: memo.trim() || undefined,
        priority: priority || undefined,
        duedate: duedate || undefined,
        project: project || undefined,
        contexts: selectedContexts.length > 0 ? selectedContexts : undefined,
        clips: selectedClips.length > 0 ? selectedClips : undefined,
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
    duedate !== (task.duedate ?? "") ||
    project !== (task.project ?? "") ||
    JSON.stringify(selectedContexts.sort()) !==
      JSON.stringify((task.contexts ?? []).sort()) ||
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

            {/* コンテキスト */}
            <Form.Group className="mb-3">
              <Form.Label className="task-edit-field-label">
                コンテキスト
              </Form.Label>
              <div className="task-edit-contexts">
                {contexts.length === 0 ? (
                  <p className="text-muted small mb-0">
                    コンテキストが登録されていません
                  </p>
                ) : (
                  contexts.map((ctx) => (
                    <Form.Check
                      key={ctx.id}
                      type="checkbox"
                      id={`edit-context-${ctx.id}`}
                      label={ctx.name}
                      checked={selectedContexts.includes(ctx.id)}
                      onChange={() => handleContextToggle(ctx.id)}
                    />
                  ))
                )}
              </div>
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