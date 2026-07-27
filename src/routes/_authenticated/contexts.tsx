import { createFileRoute } from "@tanstack/react-router";
import { Col, Container, Row } from "react-bootstrap";
import { useState } from "react";
import { ContextManager } from "../../features/contexts/components/ContextManager";
import { ContextTaskList } from "../../features/contexts/components/ContextTaskList";

export const Route = createFileRoute("/_authenticated/contexts")({
  component: ContextsPage,
});

function ContextsPage() {
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [selectedContextName, setSelectedContextName] = useState("");

  return (
    <Container className="py-4">
      <h4>コンテキスト</h4>
      <hr />
      <Row>
        <Col md={5} lg={4}>
          <ContextManager
            selectedId={selectedContextId}
            onSelect={(id, name) => {
              setSelectedContextId(id);
              setSelectedContextName(name);
            }}
          />
        </Col>
        <Col md={7} lg={8}>
          {selectedContextId ? (
            <ContextTaskList
              contextId={selectedContextId}
              contextName={selectedContextName}
            />
          ) : (
            <p className="text-muted">左のコンテキストを選択してください</p>
          )}
        </Col>
      </Row>
    </Container>
  );
}
