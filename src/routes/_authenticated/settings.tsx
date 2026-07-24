import { createFileRoute } from "@tanstack/react-router";
import { Col, Container, Row } from "react-bootstrap";
import { ContextManager } from "../../features/contexts/components/ContextManager";

export const Route = createFileRoute("/_authenticated/settings")({
  component: Settings,
});

function Settings() {
  return (
    <Container className="py-4">
      <h4>設定</h4>
      <hr />
      <Row>
        <Col md={6} lg={5}>
          <ContextManager />
        </Col>
      </Row>
    </Container>
  );
}
