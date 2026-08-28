import { useState, useMemo } from "react";
import { Container } from "react-bootstrap";
import { Link, useLocation } from "@tanstack/react-router";
import { useClips } from "../hooks/useClips";
import { ClipList } from "../components/ClipList";
import { ClipDetailModal } from "../components/ClipDetailModal";
import type { ClipsResponse } from "../../../lib/pb_types";
import { BarChart3, Paperclip } from "lucide-react";
import "./ClipsPage.css";

export function ClipsPage() {
  const location = useLocation();
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
    refetch,
  } = useClips();

  const clips = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  const [selectedClip, setSelectedClip] = useState<ClipsResponse | null>(null);

  return (
    <div className="clips-page">
      <Container>
        {/* ヘッダー */}
        <div className="clips-page-header">
          <div className="clips-page-header-icon">
            <Paperclip size={22} />
          </div>
          <div>
            <h1 className="clips-page-header-title">Clips</h1>
            <p className="clips-page-header-sub">
              {clips.length} 件のクリップ
            </p>
          </div>
          <Link to="/clips/data/new" search={{ returnTo: location.href }} className="btn btn-primary ms-auto d-inline-flex align-items-center gap-2">
            <BarChart3 size={16} /> データCLIP
          </Link>
        </div>

        <ClipList
          clips={clips}
          isLoading={isLoading}
          isError={isError}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          isFetchNextPageError={isFetchNextPageError}
          onLoadMore={() => fetchNextPage()}
          onRetry={() => void refetch()}
          onClipClick={setSelectedClip}
        />

        <ClipDetailModal
          clip={selectedClip}
          show={selectedClip !== null}
          onClose={() => setSelectedClip(null)}
        />
      </Container>
    </div>
  );
}
