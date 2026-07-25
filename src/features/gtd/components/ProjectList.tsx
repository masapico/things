import { useState } from "react";
import { Container, Row, Col, Spinner, Badge } from "react-bootstrap";
import { useActiveProjects, useArchivedProjects } from "../hooks/useProjects";
import "./ProjectList.css";
import { ChevronRight, Play, Flag, FolderKanban, Archive } from "lucide-react";
import { Link } from "@tanstack/react-router";

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

export function ProjectList() {
  const [showArchived, setShowArchived] = useState(false);
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

      {/* トグル */}
      <div className="project-list-toggle">
        <button
          type="button"
          className={`project-list-toggle-btn${!showArchived ? " project-list-toggle-btn--active" : ""}`}
          onClick={() => setShowArchived(false)}
        >
          アクティブ
        </button>
        <button
          type="button"
          className={`project-list-toggle-btn${showArchived ? " project-list-toggle-btn--active" : ""}`}
          onClick={() => setShowArchived(true)}
        >
          <Archive size={14} />
          アーカイブ
        </button>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="project-list-empty">
          <p>{label}なプロジェクトはありません。</p>
        </div>
      ) : (
        <Row xs={1} sm={1} md={2} lg={2} xl={3} className="g-3">
          {projects.map((project) => (
            <Col key={project.id}>
              <Link
                to="/gtd/$projectid"
                params={{ projectid: project.id }}
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