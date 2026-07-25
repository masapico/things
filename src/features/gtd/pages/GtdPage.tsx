import { useState } from "react";
import { ProjectList } from "../components/ProjectList";
import { ProjectCreateModal } from "../components/ProjectCreateModal";

export function GtdPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div>
      <ProjectList onCreateClick={() => setShowCreateModal(true)} />
      <ProjectCreateModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}