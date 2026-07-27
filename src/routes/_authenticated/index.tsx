// src/routes/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Divide, Inbox, PhoneIncoming, Smile, SquareKanban, Target } from "lucide-react";
import { Container, ListGroup, Row } from "react-bootstrap";
import { useIndexPageTasks } from "../../features/gtd/hooks/useTasks";
import { UnifiedTaskListRow } from "../../features/gtd/components/UnifiedTaskListRow";
import { TaskAddForm } from "../../features/gtd/components/TaskAddForm";
import type { TasksResponse } from "../../lib/pb_types";

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
      filter: (t) => t.status === "inbox",
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
    <Container>
      <Row className="mt-5 mb-3 justify-content-center">
        <div className="w-75">
          <TaskAddForm />
        </div>
      </Row>

      {sections.map((section) => {
        const tasks = indexPageTasks?.filter(section.filter) ?? [];
        return (
          <>
            {section.key === "duedate" ? <div className="mt-3"></div> : null}
            <Row key={section.key} className="mb-3 justify-content-center">
              <div className="w-75">
                <div className="p-2">
                  {section.icon}
                  <span className="ms-2">{section.label}</span>
                </div>
                <ListGroup>
                  {tasks.length === 0 && (
                    <ListGroup.Item className="text-muted py-1 bg-light">
                      <Smile size={12} />
                    </ListGroup.Item>
                  )}
                  {tasks.map((task) => (
                    <UnifiedTaskListRow key={task.id} task={task} />
                  ))}
                </ListGroup>
              </div>
            </Row>
          </>
        );
      })}
    </Container>
  );
}
