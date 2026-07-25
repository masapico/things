// src/routes/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { Inbox, PhoneIncoming, Smile, Target } from "lucide-react";
import { Container, ListGroup, Row } from "react-bootstrap";
import { useIndexPageTasks } from "../../features/gtd/hooks/useTasks";
import { InboxTaskListRow } from "../../features/gtd/components/InboxTaskListRow";
import { NextTaskListRow } from "../../features/gtd/components/NextTaskListRow";
import { WaitingTaskListRow } from "../../features/gtd/components/WaitingTaskListRow";
import { TaskAddForm } from "../../features/gtd/components/TaskAddForm";

export const Route = createFileRoute("/_authenticated/")({
  component: Index,
});

function Index() {
  const { data: indexPageTasks } = useIndexPageTasks();

  return (
    <Container>
      <Row className="mt-5 mb-3 justify-content-center">
        <div className="w-75">
          <TaskAddForm />
        </div>
      </Row>

      <Row className="mb-3 justify-content-center">
        <div className="w-75">
          <div className="p-2">
            <Inbox size={16} className="me-2" />
            Inbox
          </div>
          <ListGroup>
            {indexPageTasks?.filter((t) => t.status === "inbox").length ===
              0 && (
              <ListGroup.Item className="text-muted py-1 bg-light">
                <Smile size={12} />
              </ListGroup.Item>
            )}
            {indexPageTasks
              ?.filter((t) => t.status === "inbox")
              .map((task) => (
                <InboxTaskListRow key={task.id} task={task} />
              ))}
          </ListGroup>
        </div>
      </Row>

      <Row className="mb-3 justify-content-center">
        <div className="w-75">
          <div className="p-2">
            <Target size={16} className="me-2" />
            Next
          </div>
          <ListGroup>
            {indexPageTasks?.filter((t) => t.status === "next").length ===
              0 && (
              <ListGroup.Item className="text-muted py-1 bg-light">
                <Smile size={12} />
              </ListGroup.Item>
            )}
            {indexPageTasks
              ?.filter((t) => t.status === "next")
              .map((task) => (
                <NextTaskListRow key={task.id} task={task} />
              ))}
          </ListGroup>
        </div>
      </Row>

      <Row className="mb-3 justify-content-center">
        <div className="w-75">
          <div className="p-2">
            <PhoneIncoming size={16} className="me-2" />
            Waiting
          </div>
          <ListGroup>
            {indexPageTasks?.filter((t) => t.status === "waiting").length ===
              0 && (
              <ListGroup.Item className="text-muted py-1 bg-light">
                <Smile size={12} />
              </ListGroup.Item>
            )}
            {indexPageTasks
              ?.filter((t) => t.status === "waiting")
              .map((task) => (
                <WaitingTaskListRow key={task.id} task={task} />
              ))}
          </ListGroup>
        </div>
      </Row>
    </Container>
  );
}
