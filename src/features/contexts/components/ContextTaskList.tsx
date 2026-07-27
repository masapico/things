import { ListGroup, Spinner } from "react-bootstrap";
import { Inbox, PhoneIncoming, Smile, Target } from "lucide-react";
import { useTasksByContext } from "../hooks/useContexts";
import { UnifiedTaskListRow } from "../../gtd/components/UnifiedTaskListRow";
import type { TasksResponse } from "../../../lib/pb_types";
import "./ContextTaskList.css";

type ContextTaskListProps = {
  contextId: string;
  contextName: string;
};

type Section = {
  key: string;
  icon: React.ReactNode;
  label: string;
  filter: (task: TasksResponse) => boolean;
};

const sections: Section[] = [
  {
    key: "inbox",
    icon: <Inbox size={14} />,
    label: "Inbox",
    filter: (t) => t.status === "inbox",
  },
  {
    key: "next",
    icon: <Target size={14} />,
    label: "Next",
    filter: (t) => t.status === "next",
  },
  {
    key: "waiting",
    icon: <PhoneIncoming size={14} />,
    label: "Waiting",
    filter: (t) => t.status === "waiting",
  },
  {
    key: "someday",
    icon: <Smile size={14} />,
    label: "Someday",
    filter: (t) => t.status === "someday",
  },
  {
    key: "completed",
    icon: <Smile size={14} />,
    label: "Completed",
    filter: (t) => t.status === "completed",
  },
];

export function ContextTaskList({ contextId, contextName }: ContextTaskListProps) {
  const { data: tasks = [], isLoading, isError } = useTasksByContext(contextId);

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" size="sm" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-danger">タスクの読み込みに失敗しました。</p>;
  }

  return (
    <div>
      <h5 className="mb-3" style={{fontSize:".8rem", color:"#aaa"}}>{contextName} のタスク</h5>

      {tasks.length === 0 ? (
        <p className="text-muted">このコンテキストに属するタスクはありません。</p>
      ) : (
        sections.map((section) => {
          const filtered = tasks.filter(section.filter);
          if (filtered.length === 0) return null;
          return (
            <div key={section.key} className="mb-3">
              <div className="ctx-task-section-header mb-1">
                {section.icon}
                <span className="ms-1">{section.label}</span>
                <span className="ms-1">({filtered.length})</span>
              </div>
              <ListGroup>
                {filtered.map((task) => (
                  <UnifiedTaskListRow key={task.id} task={task} />
                ))}
              </ListGroup>
            </div>
          );
        })
      )}
    </div>
  );
}
