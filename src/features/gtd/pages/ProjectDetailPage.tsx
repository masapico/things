import { useState } from "react";
import { Container, Spinner, ListGroup, Badge, Stack } from "react-bootstrap";
import { useProject, useToggleReview } from "../hooks/useProjects";
import { useProjectTasks } from "../hooks/useProjectTasks";
import { ProjectEditModal } from "../components/ProjectEditModal";
import { InboxTaskListRow } from "../components/InboxTaskListRow";
import { NextTaskListRow } from "../components/NextTaskListRow";
import { WaitingTaskListRow } from "../components/WaitingTaskListRow";
import { CompletedTaskListRow } from "../components/CompletedTaskListRow";
import { TaskAddForm } from "../components/TaskAddForm";
import type { TasksResponse } from "../../../lib/pb_types";
import {
  ArrowLeft,
  Play,
  Flag,
  Pencil,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Eye,
  EyeOff,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import "./ProjectDetailPage.css";

type ProjectDetailPageProps = {
  projectId: string;
};

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

const STATUS_LABEL: Record<string, string> = {
  inbox: "Inbox",
  next: "Next",
  waiting: "Waiting",
  completed: "Done",
  someday: "Someday",
};

export function ProjectDetailPage({ projectId }: ProjectDetailPageProps) {
  const {
    data: project,
    isLoading: projectLoading,
    isError: projectError,
  } = useProject(projectId);
  const {
    data: tasks,
    isLoading: tasksLoading,
    isError: tasksError,
  } = useProjectTasks(projectId);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const toggleReview = useToggleReview();

  // ---- Loading ----
  if (projectLoading || tasksLoading) {
    return (
      <Container className="mt-4">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  // ---- Error ----
  if (projectError || !project) {
    return (
      <Container className="mt-4">
        <p className="text-danger">プロジェクトが見つかりませんでした。</p>
        <Link to="/gtd" className="btn btn-outline-secondary btn-sm mt-2">
          <ArrowLeft size={14} className="me-1" />
          プロジェクト一覧に戻る
        </Link>
      </Container>
    );
  }

  if (tasksError) {
    return (
      <Container className="mt-4">
        <p className="text-danger">タスクの読み込みに失敗しました。</p>
      </Container>
    );
  }

  const partitioned = partitionTasks(tasks ?? []);
  const totalTasks = (tasks ?? []).length;
  const doneCount = partitioned.completed.length;
  const progressPct = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;
  const clipCount = project.clips?.length ?? 0;
  const daysSince = daysSinceUpdated(project.updated);
  const needsReview = daysSince > 5;

  return (
    <div className="project-detail">
      {/* ── ヘッダー ── */}
      <div className="project-detail-header">
        <div className="project-detail-header-top">
          <Link
            to="/gtd"
            className="project-detail-back"
            aria-label="プロジェクト一覧に戻る"
          >
            <ArrowLeft size={18} />
          </Link>
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
                <Badge className="project-detail-clip-badge" pill>
                  {clipCount} clips
                </Badge>
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
        <Stack direction="horizontal" gap={2} className="project-detail-progress">
          <div className="project-detail-progress-bar w-50">
            <div
              className="project-detail-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="project-detail-progress-info">
            <span className="project-detail-progress-pct">{progressPct}% 完了</span>
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
          <>
            {renderSection("inbox", partitioned.inbox)}
            {renderSection("next", partitioned.next)}
            {renderSection("waiting", partitioned.waiting)}
            {renderSection("someday", partitioned.someday)}

            {/* 完了タスク（折りたたみ） */}
            {partitioned.completed.length > 0 && (
              <div className="project-detail-section">
                <button
                  className="project-detail-section-toggle"
                  onClick={() => setShowCompleted((v) => !v)}
                >
                  {showCompleted ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                  <span className="project-detail-section-label">
                    Done
                  </span>
                  <span className="project-detail-section-count">
                    {partitioned.completed.length}
                  </span>
                </button>
                {showCompleted && (
                  <ListGroup variant="flush" className="project-detail-task-list">
                    {partitioned.completed.map((task) => (
                      <CompletedTaskListRow key={task.id} task={task} />
                    ))}
                  </ListGroup>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 編集モーダル ── */}
      <ProjectEditModal
        project={project}
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
    </div>
  );
}

/** セクション描画ヘルパー */
function renderSection(status: string, tasks: TasksResponse[]) {
  if (tasks.length === 0) return null;

  return (
    <div className="project-detail-section">
      <div className="project-detail-section-header">
        <span className="project-detail-section-label">
          {STATUS_LABEL[status] ?? status}
        </span>
        <span className="project-detail-section-count">{tasks.length}</span>
      </div>
      <ListGroup variant="flush" className="project-detail-task-list">
        {tasks.map((task) => {
          switch (status) {
            case "inbox":
              return <InboxTaskListRow key={task.id} task={task} />;
            case "next":
              return <NextTaskListRow key={task.id} task={task} />;
            case "waiting":
              return <WaitingTaskListRow key={task.id} task={task} />;
            default:
              return <InboxTaskListRow key={task.id} task={task} />;
          }
        })}
      </ListGroup>
    </div>
  );
}
