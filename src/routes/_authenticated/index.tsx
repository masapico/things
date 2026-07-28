// src/routes/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Inbox, PhoneIncoming, Smile, Target } from "lucide-react";
import { Container, ListGroup } from "react-bootstrap";
import { Fragment } from "react";
import { useIndexPageTasks } from "../../features/gtd/hooks/useTasks";
import { UnifiedTaskListRow } from "../../features/gtd/components/UnifiedTaskListRow";
import { DeadlineTaskListRow } from "../../features/gtd/components/DeadlineTaskListRow";
import { TaskAddForm } from "../../features/gtd/components/TaskAddForm";
import type { TasksResponse, ProjectsResponse } from "../../lib/pb_types";

export const Route = createFileRoute("/_authenticated/")({
  component: Index,
});

type Section = {
  key: string;
  icon: React.ReactNode;
  label: string;
  filter: (task: TasksResponse) => boolean;
};

function Index() {
  const { data: indexPageTasks } = useIndexPageTasks();

  const sections: Section[] = [
    {
      key: "inbox",
      icon: <Inbox size={16} />,
      label: "Inbox",
      filter: (t) => t.status === "inbox" && t.project === "",
    },
    {
      key: "next",
      icon: <Target size={16} />,
      label: "Next",
      filter: (t) => t.status === "next",
    },
    {
      key: "waiting",
      icon: <PhoneIncoming size={16} />,
      label: "Waiting",
      filter: (t) => t.status === "waiting",
    },
    {
      key: "duedate",
      icon: <Calendar size={16} />,
      label: "Deadlines",
      filter: (t) =>
        t.duedate != null && t.duedate !== "" && t.status !== "completed",
    },
  ];

  return (
    <Container className="py-4">
      <div className="gtd-index">
        <div className="mb-4">
          <TaskAddForm />
        </div>

        {sections.map((section) => {
          const tasks = indexPageTasks?.filter(section.filter) ?? [];
          const isDeadline = section.key === "duedate";
          return (
            <Fragment key={section.key}>
              <section
                className={`gtd-section ${isDeadline ? "gtd-section--deadline" : ""}`}
              >
                <div className="gtd-section-header">
                  {section.icon}
                  <span className="gtd-section-label">{section.label}</span>
                  <span className="gtd-section-count">{tasks.length}</span>
                </div>
                <ListGroup>
                  {tasks.length === 0 && (
                    <ListGroup.Item className="gtd-empty">
                      <Smile size={13} />
                      <span>{section.label} は空です</span>
                    </ListGroup.Item>
                  )}
                  {isDeadline
                    ? tasks.map((task) => (
                        <DeadlineTaskListRow
                          key={task.id}
                          task={task}
                          projectName={
                            (task.expand as { project?: ProjectsResponse } | undefined)?.project?.name
                          }
                        />
                      ))
                    : tasks.map((task) => (
                        <UnifiedTaskListRow key={task.id} task={task} />
                      ))}
                </ListGroup>
              </section>
            </Fragment>
          );
        })}
      </div>
    </Container>
  );
}
