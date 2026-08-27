import { Container, Row, Col, Spinner, Badge } from "react-bootstrap";
import { useActiveProjects, useArchivedProjects, useProjectTaskCounts } from "../hooks/useProjects";
import "./ProjectList.css";
import { ChevronRight, Play, Flag, FolderKanban, Archive, Plus, RefreshCw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ProjectListView } from "../navigation";

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

type ProjectListProps = {
  view: ProjectListView;
  onViewChange: (view: ProjectListView) => void;
  onCreateClick: () => void;
};

export function ProjectList({
  view,
  onViewChange,
  onCreateClick,
}: ProjectListProps) {
  const showArchived = view === "archived";
  const {
    data: activeProjects,
    isLoading: activeLoading,
    isError: activeError,
    error: activeErr,
  } = useActiveProjects();
  const {
    data: archivedProjects,
    isLoading: archivedLoading,
    isError: archivedError,
    error: archivedErr,
  } = useArchivedProjects();
  const { data: taskCounts } = useProjectTaskCounts();

  const isLoading = showArchived ? archivedLoading : activeLoading;
  const isError = showArchived ? archivedError : activeError;
  const error = showArchived ? archivedErr : activeErr;
  const projects = showArchived ? archivedProjects : activeProjects;
  const label = showArchived ? "アーカイブ" : "アクティブ";

  if (isLoading) {
    return (
      <Container className="mt-4">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container className="mt-4">
        <p className="text-danger">
          Failed to load projects: {error?.message ?? "Unknown error"}
        </p>
      </Container>
    );
  }

  return (
    <div className="project-list">
      <div className="project-list-header">
        <div className="project-list-header-left">
          <div className="project-list-header-icon">
            <FolderKanban size={22} />
          </div>
          <div>
            <h1 className="project-list-header-title">Projects</h1>
            <p className="project-list-header-sub">
              {projects?.length ?? 0} 件の{label}なプロジェクト
            </p>
          </div>
        </div>
        <div className="project-list-header-actions">
          <Link to="/gtd/review" className="project-list-review-btn">
            <RefreshCw size={15} />
            週次レビュー
          </Link>
          <button
            type="button"
            className="project-list-create-btn"
            onClick={onCreateClick}
          >
            <Plus size={16} />
            新規作成
          </button>
        </div>
      </div>

      {/* トグル */}
      <div className="project-list-toggle">
        <button
          type="button"
          className={`project-list-toggle-btn${!showArchived ? " project-list-toggle-btn--active" : ""}`}
          onClick={() => onViewChange("active")}
        >
          アクティブ
        </button>
        <button
          type="button"
          className={`project-list-toggle-btn${showArchived ? " project-list-toggle-btn--active" : ""}`}
          onClick={() => onViewChange("archived")}
        >
          <Archive size={14} />
          アーカイブ
        </button>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="project-list-empty">
          <div className="project-list-empty-icon">
            <FolderKanban size={28} />
          </div>
          <p className="project-list-empty-text">
            {label}なプロジェクトはありません。
          </p>
          {!showArchived ? (
            <button
              type="button"
              className="project-list-create-btn"
              onClick={onCreateClick}
            >
              <Plus size={16} />
              最初のプロジェクトを作成
            </button>
          ) : null}
        </div>
      ) : (
        <Row xs={1} sm={1} md={2} lg={2} xl={3} className="g-3">
          {projects.map((project) => (
            <Col key={project.id}>
              <Link
                to="/gtd/$projectid"
                params={{ projectid: project.id }}
                search={{ returnTo: view }}
                className="project-list-card-link"
              >
                <div className={`project-list-card${showArchived ? " project-list-card--archived" : ""}`}>
                  {/* header */}
                  <div className="project-list-card-header">
                    <span className={`project-list-card-dot${showArchived ? " project-list-card-dot--archived" : ""}`} />
                    <h2 className="project-list-card-title">{project.name}</h2>
                    <ChevronRight
                      size={15}
                      className="project-list-card-chevron"
                    />
                  </div>

                  {/* memo */}
                  {project.memo ? (
                    <div className="project-list-card-memo">
                      <p className="project-list-card-memo-text">
                        {project.memo}
                      </p>
                    </div>
                  ) : (
                    <div className="project-list-card-memo-placeholder" />
                  )}

                  {/* footer */}
                  <div className="project-list-card-footer">
                    <div className="project-list-card-footer-dates">
                      {project.startDate ? (
                        <span className="project-list-card-date">
                          <Play size={11} />
                          {formatDate(project.startDate)}
                        </span>
                      ) : null}
                      {project.endDate ? (
                        <span className="project-list-card-date">
                          <Flag size={11} />
                          {formatDate(project.endDate)}
                        </span>
                      ) : null}
                    </div>
                    {(() => {
                      const counts = taskCounts?.get(project.id);
                      if (!counts || counts.total === 0) return null;
                      const percent = Math.round(
                        (counts.completed / counts.total) * 100,
                      );
                      return (
                        <div className="project-list-card-progress">
                          <div className="project-list-card-progress-track">
                            <div
                              className="project-list-card-progress-fill"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="project-list-card-progress-text">
                            {counts.completed}/{counts.total}
                          </span>
                        </div>
                      );
                    })()}
                    {project.clips && project.clips.length > 0 ? (
                      <Badge className="project-list-card-badge" pill>
                        {project.clips.length} clips
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </Link>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
