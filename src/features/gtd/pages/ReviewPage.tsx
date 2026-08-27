import { useMemo } from "react";
import { Alert, Badge, Button, ListGroup, Spinner } from "react-bootstrap";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FolderSearch,
  Inbox,
  MoonStar,
  RefreshCw,
  Target,
} from "lucide-react";
import type { ProjectsResponse, TasksResponse } from "../../../lib/pb_types";
import { UnifiedTaskListRow } from "../components/UnifiedTaskListRow";
import { useActiveProjects, useToggleReview } from "../hooks/useProjects";
import { useReviewTasks } from "../hooks/useReviewTasks";
import "./ReviewPage.css";

const DAY_MS = 24 * 60 * 60 * 1000;

function localDay(value: string | Date): number {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function daysSince(value: string): number {
  return Math.floor((localDay(new Date()) - localDay(value)) / DAY_MS);
}

type ReviewSection = {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tasks: TasksResponse[];
};

function ReviewTaskSection({ section }: { section: ReviewSection }) {
  if (section.tasks.length === 0) return null;

  return (
    <section className="review-section">
      <div className="review-section-header">
        <div className="review-section-title-row">
          {section.icon}
          <h2>{section.title}</h2>
          <Badge pill>{section.tasks.length}</Badge>
        </div>
        <p>{section.description}</p>
      </div>
      <ListGroup variant="flush" className="review-task-list">
        {section.tasks.map((task) => (
          <UnifiedTaskListRow key={task.id} task={task} />
        ))}
      </ListGroup>
    </section>
  );
}

type ProjectAttention = {
  project: ProjectsResponse;
  reasons: string[];
};

export function ReviewPage() {
  const tasksQuery = useReviewTasks();
  const projectsQuery = useActiveProjects();
  const toggleReview = useToggleReview();

  const reviewData = useMemo(() => {
    const tasks = tasksQuery.data ?? [];
    const today = localDay(new Date());
    const overdue = tasks.filter(
      (task) => Boolean(task.duedate) && localDay(task.duedate) < today,
    );
    const overdueIds = new Set(overdue.map((task) => task.id));
    const inbox = tasks.filter(
      (task) => task.status === "inbox" && !overdueIds.has(task.id),
    );
    const waiting = tasks.filter(
      (task) =>
        task.status === "waiting" &&
        !overdueIds.has(task.id) &&
        daysSince(task.updated) >= 7,
    );
    const someday = tasks.filter(
      (task) => task.status === "someday" && !overdueIds.has(task.id),
    );

    const tasksByProject = new Map<string, TasksResponse[]>();
    for (const task of tasks) {
      if (!task.project) continue;
      const projectTasks = tasksByProject.get(task.project) ?? [];
      projectTasks.push(task);
      tasksByProject.set(task.project, projectTasks);
    }

    const projects: ProjectAttention[] = (projectsQuery.data ?? []).flatMap(
      (project) => {
        const reasons: string[] = [];
        const projectTasks = tasksByProject.get(project.id) ?? [];
        if (daysSince(project.updated) > 5) reasons.push("レビュー期限超過");
        if (!projectTasks.some((task) => task.status === "next")) {
          reasons.push("Nextなし");
        }
        return reasons.length > 0 ? [{ project, reasons }] : [];
      },
    );

    return { overdue, inbox, waiting, someday, projects };
  }, [projectsQuery.data, tasksQuery.data]);

  if (tasksQuery.isLoading || projectsQuery.isLoading) {
    return (
      <div className="review-page review-page-state">
        <Spinner animation="border" size="sm" />
        <span>レビュー項目を読み込んでいます…</span>
      </div>
    );
  }

  if (tasksQuery.isError || projectsQuery.isError) {
    return (
      <div className="review-page">
        <Alert variant="danger">レビュー項目を読み込めませんでした。</Alert>
      </div>
    );
  }

  const sections: ReviewSection[] = [
    {
      key: "overdue",
      title: "期限超過",
      description: "期限を過ぎている未完了タスクです。",
      icon: <AlertTriangle size={18} />,
      tasks: reviewData.overdue,
    },
    {
      key: "inbox",
      title: "未整理 Inbox",
      description: "行動可能な状態やプロジェクトへ整理します。",
      icon: <Inbox size={18} />,
      tasks: reviewData.inbox,
    },
    {
      key: "waiting",
      title: "停滞 Waiting",
      description: "7日以上更新されていない待機タスクです。",
      icon: <Clock3 size={18} />,
      tasks: reviewData.waiting,
    },
    {
      key: "someday",
      title: "Someday",
      description: "今週行動へ移すものがないか確認します。",
      icon: <MoonStar size={18} />,
      tasks: reviewData.someday,
    },
  ];
  const taskCount = sections.reduce(
    (total, section) => total + section.tasks.length,
    0,
  );
  const totalCount = taskCount + reviewData.projects.length;

  return (
    <div className="review-page">
      <header className="review-header">
        <Link to="/gtd" search={{ view: "active" }} className="review-back">
          <ArrowLeft size={17} />
          Projects
        </Link>
        <div className="review-heading">
          <div className="review-heading-icon">
            <RefreshCw size={21} />
          </div>
          <div>
            <h1>週次レビュー</h1>
            <p>{totalCount} 件の確認項目</p>
          </div>
        </div>
      </header>

      {toggleReview.isError ? (
        <Alert variant="danger">レビュー状態を更新できませんでした。</Alert>
      ) : null}

      {totalCount === 0 ? (
        <div className="review-complete">
          <CheckCircle2 size={38} />
          <h2>レビュー完了</h2>
          <p>現在確認が必要な項目はありません。</p>
        </div>
      ) : (
        <>
          {sections.map((section) => (
            <ReviewTaskSection key={section.key} section={section} />
          ))}

          {reviewData.projects.length > 0 ? (
            <section className="review-section">
              <div className="review-section-header">
                <div className="review-section-title-row">
                  <FolderSearch size={18} />
                  <h2>要確認プロジェクト</h2>
                  <Badge pill>{reviewData.projects.length}</Badge>
                </div>
                <p>更新が停滞している、またはNextがないプロジェクトです。</p>
              </div>
              <div className="review-project-list">
                {reviewData.projects.map(({ project, reasons }) => (
                  <div key={project.id} className="review-project-row">
                    <div className="review-project-main">
                      <Target size={16} />
                      <Link
                        to="/gtd/$projectid"
                        params={{ projectid: project.id }}
                        search={{ returnTo: "review" }}
                      >
                        {project.name}
                      </Link>
                    </div>
                    <div className="review-project-reasons">
                      {reasons.map((reason) => (
                        <Badge key={reason}>{reason}</Badge>
                      ))}
                    </div>
                    <Button
                      variant="outline-success"
                      size="sm"
                      disabled={toggleReview.isPending}
                      onClick={() => toggleReview.mutate(project)}
                    >
                      レビュー済み
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
