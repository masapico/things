import { Container, Stack } from "react-bootstrap";
import { useClips } from "../hooks/useClips";
import { ClipList } from "../components/ClipList";

export function ClipsPage() {
  const { data: clips = [], isLoading, isError } = useClips();

  return (
    <Container className="py-4">
      <Stack
        direction="horizontal"
        className="justify-content-between align-items-start mb-4"
      >
        <div>
          <h1 className="h3 mb-1">Clips</h1>
          <p className="text-muted mb-0">Saved clips from your workspace.</p>
        </div>
      </Stack>

      <ClipList clips={clips} isLoading={isLoading} isError={isError} />
    </Container>
  );
}
