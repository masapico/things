import { Card, Container, Row, Col, Spinner, Badge } from "react-bootstrap";
import { useActiveProjects } from "../hooks/useProjects";
import type { ProjectsResponse } from "../../../lib/pb_types";
import "./ProjectList.css";
import { ChevronRight, Play, Flag } from "lucide-react";

type ProjectListProps = {
  onSelectProject?: (project: ProjectsResponse) => void;
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

export function ProjectList({ onSelectProject }: ProjectListProps) {
  const { data: projects, isLoading, isError, error } = useActiveProjects();

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
    <Container className="mt-4">
      <h1 className="project-list-header mb-4">Projects</h1>

      {!projects || projects.length === 0 ? (
        <p className="project-list-empty">
          No projects found in the workspace.
        </p>
      ) : (
        <Row xs={1} sm={2} lg={3} xl={4} className="g-3">
          {projects.map((project) => (
            <Col key={project.id}>
              <Card
                as="a"
                className="project-list-card h-100 text-decoration-none text-reset"
                role="button"
                onClick={() => onSelectProject?.(project)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectProject?.(project);
                  }
                }}
                tabIndex={onSelectProject ? 0 : undefined}
              >
                <Card.Body className="d-flex flex-column gap-2">
                  {/* header row */}
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div className="d-flex align-items-center gap-2 min-w-0">
                      <span className="project-list-card-active-dot" />
                      <Card.Title
                        as="h2"
                        className="project-list-card-title h6 mb-0 text-truncate"
                      >
                        {project.name}
                      </Card.Title>
                    </div>
                    <ChevronRight
                      size={14}
                      className="flex-shrink-0"
                      style={{ color: "#5b6b64", marginTop: 2 }}
                    />
                  </div>

                  {/* memo preview */}
                  {project.memo ? (
                    <div className="project-list-card-memo">
                      <Card.Text className="project-list-card-memo-text mb-0">
                        {project.memo}
                      </Card.Text>
                    </div>
                  ) : null}

                  {/* footer meta */}
                  <div className="project-list-card-meta d-flex align-items-center gap-3 mt-auto">
                    {project.startDate ? (
                      <span className="d-flex align-items-center gap-1 text-nowrap">
                        <Play size={12} className="text-success" />
                        {formatDate(project.startDate)}
                      </span>
                    ) : null}
                    {project.endDate ? (
                      <span className="d-flex align-items-center gap-1 text-nowrap">
                        <Flag size={12} className="text-danger"/>
                        {formatDate(project.endDate)}
                      </span>
                    ) : null}
                    {project.clips && project.clips.length > 0 ? (
                      <Badge className="project-list-card-badge ms-auto" pill>
                        {project.clips.length} clips
                      </Badge>
                    ) : null}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
}
