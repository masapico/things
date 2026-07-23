// src/routes/index.tsx
import { useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Inbox, ListPlus, PhoneIncoming, Smile, Target } from "lucide-react";
import {
  Button,
  Container,
  Form,
  InputGroup,
  ListGroup,
  Row,
} from "react-bootstrap";
import {
  useIndexPageTasks,
  useCreateInboxTask,
} from "../../features/gtd/hooks/useTasks";
import { InboxTaskListRow } from "../../features/gtd/components/InboxTaskListRow";
import { NextTaskListRow } from "../../features/gtd/components/NextTaskListRow";
import { WaitingTaskListRow } from "../../features/gtd/components/WaitingTaskListRow";

export const Route = createFileRoute("/_authenticated/")({
  component: Index,
});

function Index() {
  const taskTitleInput = useRef<HTMLInputElement>(null);

  const { data: indexPageTasks } = useIndexPageTasks();

  const { mutate, isPending } = useCreateInboxTask();

  function handleAddTask(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    const taskTitle = taskTitleInput.current
      ? taskTitleInput.current.value
      : "";
    if (taskTitle.trim() === "") return;

    mutate(
      { title: taskTitle, status: "inbox" },
      {
        onSuccess: () => {
          if (taskTitleInput.current) taskTitleInput.current.value = "";
        },
      },
    );
  }

  return (
    <Container>
      <Row className="mt-5 mb-3 justify-content-center">
        <div className="w-75">
          <Form onSubmit={handleAddTask} id="inboxTaskInput">
            <InputGroup>
              <Form.Control
                aria-label="input-task"
                aria-describedby="input-task"
                autoComplete="off"
                tabIndex={2}
                ref={taskTitleInput}
              />
              <Button
                size="sm"
                variant="outline-secondary"
                id="button-add-task"
                tabIndex={3}
                type="submit"
                style={{ borderColor: "#ddd" }}
                disabled={isPending}
              >
                {isPending ? "..." : <ListPlus />}
              </Button>
            </InputGroup>
          </Form>
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
