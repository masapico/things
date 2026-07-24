import { useState } from "react";
import { Container, Stack } from "react-bootstrap";
import { useClips } from "../hooks/useClips";
import { ClipList } from "../components/ClipList";
import { ClipDetailModal } from "../components/ClipDetailModal";
import type { ClipsResponse } from "../../../lib/pb_types";
import { Paperclip } from "lucide-react";

export function ClipsPage() {
  const { data: clips = [], isLoading, isError } = useClips();
  const [selectedClip, setSelectedClip] = useState<ClipsResponse | null>(null);

  return (
    <Container className="py-4">
      <Stack
        direction="horizontal"
        className="mb-3"
      >
        <div>
          <h1 className="h5 mb-1"><Paperclip size={18} className="me-1" />Clips</h1>
        </div>
        <div className="ms-3 pt-3">
          <p className="text-muted">my clips inventory</p>
        </div>
      </Stack>

      <ClipList clips={clips} isLoading={isLoading} isError={isError} onClipClick={setSelectedClip} />

      <ClipDetailModal
        clip={selectedClip}
        show={selectedClip !== null}
        onClose={() => setSelectedClip(null)}
      />
    </Container>
  );
}
