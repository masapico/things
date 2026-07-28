import { useRef, useState, useEffect } from "react";
import { Button, Form, InputGroup } from "react-bootstrap";
import { ListPlus } from "lucide-react";
import { useCreateTask, type CreateTaskInput } from "../hooks/useTasks";

type TaskAddFormProps = {
  /** タスク作成時に付与するプロジェクトID（省略可） */
  projectId?: string;
  /** 作成後のコールバック */
  onCreated?: () => void;
};

export function TaskAddForm({ projectId, onCreated }: TaskAddFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate, isPending } = useCreateTask();
  const [showSuccess, setShowSuccess] = useState(false);

  // 成功フィードバックを短時間だけ表示
  useEffect(() => {
    if (!showSuccess) return;
    const timer = setTimeout(() => setShowSuccess(false), 600);
    return () => clearTimeout(timer);
  }, [showSuccess]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const title = inputRef.current?.value ?? "";
    if (title.trim() === "") return;

    const input: CreateTaskInput = {
      title,
      status: "inbox",
      sort: 0,
    };
    if (projectId) {
      input.project = projectId;
    }

    mutate(input, {
      onSuccess: () => {
        if (inputRef.current) inputRef.current.value = "";
        setShowSuccess(true);
        onCreated?.();
      },
    });
  }

  return (
    <Form
      onSubmit={handleSubmit}
      className={`task-add-form ${showSuccess ? "task-add-form--success" : ""}`}
    >
      <InputGroup>
        <Form.Control
          aria-label="input-task"
          autoComplete="off"
          ref={inputRef}
          placeholder="タスクを追加..."
          tabIndex={1}
        />
        <Button
          size="sm"
          variant="outline-secondary"
          type="submit"
          disabled={isPending}
          tabIndex={2}
        >
          {isPending ? "..." : <ListPlus />}
        </Button>
      </InputGroup>
    </Form>
  );
}
