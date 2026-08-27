import { Button, Spinner } from "react-bootstrap";
import { AlertCircle, Inbox } from "lucide-react";

type AsyncStateProps = {
  kind: "loading" | "error" | "empty";
  message: string;
  onRetry?: () => void;
};

export function AsyncState({ kind, message, onRetry }: AsyncStateProps) {
  return (
    <div
      className="app-async-state"
      role={kind === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {kind === "loading" ? (
        <Spinner animation="border" size="sm" aria-hidden="true" />
      ) : kind === "error" ? (
        <AlertCircle size={24} aria-hidden="true" />
      ) : (
        <Inbox size={24} aria-hidden="true" />
      )}
      <span>{message}</span>
      {kind === "error" && onRetry ? (
        <Button variant="outline-primary" size="sm" onClick={onRetry}>
          再試行
        </Button>
      ) : null}
    </div>
  );
}
