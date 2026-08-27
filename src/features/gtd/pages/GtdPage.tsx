import { useState } from "react";
import { ProjectList } from "../components/ProjectList";
import { ProjectCreateModal } from "../components/ProjectCreateModal";
import type { ProjectListView } from "../navigation";
import { useNavigate } from "@tanstack/react-router";

type GtdPageProps = {
  view: ProjectListView;
};

export function GtdPage({ view }: GtdPageProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  return (
    <div>
      <ProjectList
        view={view}
        onViewChange={(nextView) =>
          navigate({
            to: "/gtd",
            search: { view: nextView },
          })
        }
        onCreateClick={() => setShowCreateModal(true)}
      />
      <ProjectCreateModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
