import { useState, useCallback, useMemo } from "react";
import { Alert, Container, ListGroup, Badge, Stack } from "react-bootstrap";
import { useProject, useToggleReview } from "../hooks/useProjects";
import { useProjectTasks } from "../hooks/useProjectTasks";
import { ProjectEditModal } from "../components/ProjectEditModal";
import { ProjectDuplicateModal } from "../components/ProjectDuplicateModal";
import { UnifiedTaskListRow } from "../components/UnifiedTaskListRow";
import { TaskAddForm } from "../components/TaskAddForm";
import type { TasksResponse } from "../../../lib/pb_types";
import {
  ArrowLeft,
  Play,
  Flag,
  Pencil,
  Copy,
  FolderKanban,
  Eye,
  EyeOff,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ClipsPopover } from "../../clips/components/ClipsPopover";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable, isSortable } from "@dnd-kit/react/sortable";
import type { DragEndEvent } from "@dnd-kit/dom";
import { useUpdateTaskSorts } from "../hooks/useTasks";
import "./ProjectDetailPage.css";
import type { ProjectReturnTo } from "../navigation";
import { AsyncState } from "../../../components/AsyncState";

type ProjectDetailPageProps = {
  projectId: string;
  returnTo: ProjectReturnTo;
};

function ProjectBackLink({ returnTo }: { returnTo: ProjectReturnTo }) {
  const content = (
    <>
      <ArrowLeft size={18} />
      <span className="visually-hidden">前の画面に戻る</span>
    </>
  );

  if (returnTo === "review") {
    return (
      <Link to="/gtd/review" className="project-detail-back">
        {content}
      </Link>
    );
  }

  return (
    <Link
      to="/gtd"
      search={{ view: returnTo }}
      className="project-detail-back"
    >
      {content}
    </Link>
  );
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** updated からの経過日数を返す。5日超でレビュー推奨 */
function daysSinceUpdated(updated: string): number {
  const now = new Date();
  const updatedDate = new Date(updated);
  const diffMs = now.getTime() - updatedDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/** タスクをステータス別に振り分ける */
function partitionTasks(tasks: TasksResponse[]) {
  const inbox: TasksResponse[] = [];
  const next: TasksResponse[] = [];
  const waiting: TasksResponse[] = [];
  const completed: TasksResponse[] = [];
  const someday: TasksResponse[] = [];

  for (const t of tasks) {
    switch (t.status) {
      case "inbox":
        inbox.push(t);
        break;
      case "next":
        next.push(t);
        break;
      case "waiting":
        waiting.push(t);
        break;
      case "completed":
        completed.push(t);
        break;
      case "someday":
        someday.push(t);
        break;
    }
  }

  return { inbox, next, waiting, completed, someday };
}

/** 全タスクを sort 昇順 → created 降順でソート */
function sortAllTasks(tasks: TasksResponse[]): TasksResponse[] {
  return [...tasks].sort((a, b) => {
    const sortA = a.sort ?? 9999;
    const sortB = b.sort ?? 9999;
    if (sortA !== sortB) return sortA - sortB;
    return new Date(b.created).getTime() - new Date(a.created).getTime();
  });
}

/** 配列をイミュータブルに並び替える */
function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = [...list];
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

/** useSortable をラップした行コンポーネント */
function SortableTaskRow({
  task,
  index,
}: {
  task: TasksResponse;
  index: number;
}) {
  const { ref, handleRef, isDragSource } = useSortable({
    id: task.id,
    index,
  });

  return (
    <UnifiedTaskListRow
      task={task}
      containerRef={ref}
      handleRef={handleRef}
      isDragging={isDragSource}
    />
  );
}

export function ProjectDetailPage({
  projectId,
  returnTo,
}: ProjectDetailPageProps) {
  const {
    data: project,
    isLoading: projectLoading,
    isError: projectError,
    refetch: refetchProject,
  } = useProject(projectId);
  const {
    data: tasks,
    isLoading: tasksLoading,
    isError: tasksError,
    refetch: refetchTasks,
  } = useProjectTasks(projectId);

  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [localTasks, setLocalTasks] = useState<TasksResponse[] | null>(null);
  const [reorderError, setReorderError] = useState("");

  const toggleReview = useToggleReview();
  const updateSorts = useUpdateTaskSorts();

  // サーバーデータが変わったらローカルステートをリセット
  const displayTasks = useMemo(
    () => localTasks ?? (tasks ? sortAllTasks(tasks) : []),
    [localTasks, tasks],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (event.canceled) return;
      const { source } = event.operation;
      if (!isSortable(source)) return;

      const from = source.initialIndex;
      const to = source.index;
      if (from === to) return;

      // 現在の表示順から並び替え後の配列を計算
      const reordered = reorder(displayTasks, from, to);

      // 楽観的UI更新: 即座にローカルステートを更新
      setLocalTasks(reordered);
      setReorderError("");

      // 全タスクの sort 値を振り直してサーバーに永続化
      const sortUpdates = reordered.map((t, i) => ({
        id: t.id,
        sort: i * 100,
      }));
      updateSorts.mutate(sortUpdates, {
        onError: () => setReorderError("並べ替えを保存できなかったため、元の順序に戻しました。"),
        onSettled: () => setLocalTasks(null),
      });
    },
    [displayTasks, updateSorts],
  );

  // ---- Loading ----
  if (projectLoading || tasksLoading) {
    return <Container className="py-4"><AsyncState kind="loading" message="プロジェクトを読み込んでいます…" /></Container>;
  }

  // ---- Error ----
  if (projectError) {
    return <Container className="py-4"><AsyncState kind="error" message="プロジェクトを読み込めませんでした。" onRetry={() => void refetchProject()} /></Container>;
  }

  if (!project) {
    return (
      <Container className="mt-4">
        <p className="text-danger">プロジェクトが見つかりませんでした。</p>
        <Link
          to={returnTo === "review" ? "/gtd/review" : "/gtd"}
          search={returnTo === "review" ? {} : { view: returnTo }}
          className="btn btn-outline-secondary btn-sm mt-2"
        >
          <ArrowLeft size={14} className="me-1" />
          プロジェクト一覧に戻る
        </Link>
      </Container>
    );
  }

  if (tasksError) {
    return <Container className="py-4"><AsyncState kind="error" message="タスクを読み込めませんでした。" onRetry={() => void refetchTasks()} /></Container>;
  }

  const partitioned = partitionTasks(tasks ?? []);
  const totalTasks = (tasks ?? []).length;
  const doneCount = partitioned.completed.length;
  const progressPct =
    totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;
  const clipCount = project.clips?.length ?? 0;
  const daysSince = daysSinceUpdated(project.updated);
  const needsReview = daysSince > 5;

  return (
    <div className="project-detail">
      {reorderError ? <Alert variant="danger" dismissible onClose={() => setReorderError("")} role="alert">{reorderError}</Alert> : null}
      {/* ── ヘッダー ── */}
      <div className="project-detail-header">
        <div className="project-detail-header-top">
          <ProjectBackLink returnTo={returnTo} />
          <div className="project-detail-title-row">
            <div className="project-detail-icon">
              <FolderKanban size={20} />
            </div>
            <h1 className="project-detail-name">{project.name}</h1>
            <Badge
              className={`project-detail-status ${project.isActive ? "project-detail-status--active" : "project-detail-status--archived"}`}
            >
              {project.isActive ? "Active" : "Archived"}
            </Badge>
          </div>
          <button
            className="project-detail-edit-btn"
            onClick={() => setShowDuplicateModal(true)}
            aria-label="プロジェクトを複製"
            title="プロジェクトを複製"
          >
            <Copy size={16} />
          </button>
          <button
            className="project-detail-edit-btn"
            onClick={() => setShowEditModal(true)}
            aria-label="プロジェクトを編集"
          >
            <Pencil size={16} />
          </button>
        </div>

        <Stack direction="horizontal" gap={3}>
          {/* メタ情報 */}
          <div className="project-detail-meta">
            {project.startDate && (
              <span className="project-detail-meta-item">
                <Play size={13} className="text-success" />
                {formatDate(project.startDate)}
              </span>
            )}
            {project.endDate && (
              <span className="project-detail-meta-item">
                <Flag size={13} className="text-danger" />
                {formatDate(project.endDate)}
              </span>
            )}
            {clipCount > 0 && (
              <span className="project-detail-meta-item">
                <ClipsPopover clipIds={project.clips ?? []}>
                  <Badge
                    className="project-detail-clip-badge project-detail-clip-badge--clickable"
                    pill
                    role="button"
                    title="クリップを表示"
                  >
                    CLIP {clipCount}
                  </Badge>
                </ClipsPopover>
              </span>
            )}
          </div>

          {/* レビュー情報 */}
          <div className="project-detail-review">
            <span
              className={`project-detail-review-days ${needsReview ? "project-detail-review-days--overdue" : ""}`}
            >
              最終レビューから {daysSince} 日
            </span>
            <button
              className={`project-detail-review-btn ${needsReview ? "project-detail-review-btn--overdue" : ""}`}
              onClick={() => toggleReview.mutate(project)}
              disabled={toggleReview.isPending}
              aria-label="レビュー済みとしてマーク"
              title="レビュー済みとしてマーク"
            >
              {toggleReview.isPending ? (
                "..."
              ) : needsReview ? (
                <Eye size={14} />
              ) : (
                <EyeOff size={14} />
              )}
              <span className="project-detail-review-label">
                {needsReview ? "レビュー" : "レビュー済"}
              </span>
            </button>
          </div>
        </Stack>

        {/* メモ */}
        {project.memo && (
          <div className="project-detail-memo bg-white">
            <p className="project-detail-memo-text">{project.memo}</p>
          </div>
        )}
      </div>

      {/* ── 進捗サマリー ── */}
      {totalTasks > 0 && (
        <Stack
          direction="horizontal"
          gap={2}
          className="project-detail-progress"
        >
          <div className="project-detail-progress-bar w-50 my-1">
            <div
              className="project-detail-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="project-detail-progress-info my-1">
            <span className="project-detail-progress-pct">
              {progressPct}% 完了
            </span>
            <span className="project-detail-progress-counts">
              {doneCount}/{totalTasks} タスク
            </span>
          </div>
          <div className="project-detail-progress-statuses">
            {partitioned.next.length > 0 && (
              <span className="project-detail-status-chip project-detail-status-chip--next">
                Next {partitioned.next.length}
              </span>
            )}
            {partitioned.inbox.length > 0 && (
              <span className="project-detail-status-chip project-detail-status-chip--inbox">
                Inbox {partitioned.inbox.length}
              </span>
            )}
            {partitioned.waiting.length > 0 && (
              <span className="project-detail-status-chip project-detail-status-chip--waiting">
                Waiting {partitioned.waiting.length}
              </span>
            )}
            {partitioned.someday.length > 0 && (
              <span className="project-detail-status-chip project-detail-status-chip--someday">
                Someday {partitioned.someday.length}
              </span>
            )}
          </div>
        </Stack>
      )}

      {/* ── タスク追加フォーム ── */}
      <div className="project-detail-add-task">
        <TaskAddForm projectId={projectId} />
      </div>

      {/* ── タスク一覧 ── */}
      <div className="project-detail-tasks">
        {tasks && tasks.length === 0 ? (
          <div className="project-detail-empty">
            <p>このプロジェクトにタスクはまだありません。</p>
          </div>
        ) : (
          <DragDropProvider onDragEnd={handleDragEnd}>
            <ListGroup variant="flush" className="project-detail-task-list">
              {displayTasks.map((task, index) => (
                <SortableTaskRow
                  key={task.id}
                  task={task}
                  index={index}
                />
              ))}
            </ListGroup>
          </DragDropProvider>
        )}
      </div>

      {/* ── 編集モーダル ── */}
      <ProjectEditModal
        project={project}
        taskCount={tasks?.length ?? 0}
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        onDeleted={() => {
          setShowEditModal(false);
          navigate(returnTo === "review" ? { to: "/gtd/review" } : { to: "/gtd", search: { view: returnTo } });
        }}
      />

      {/* ── 複製モーダル ── */}
      <ProjectDuplicateModal
        project={project}
        taskCount={tasks?.length ?? 0}
        show={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        onDuplicated={(newProjectId) => {
          setShowDuplicateModal(false);
          navigate({
            to: "/gtd/$projectid",
            params: { projectid: newProjectId },
            search: { returnTo: "active" },
          });
        }}
      />
    </div>
  );
}
