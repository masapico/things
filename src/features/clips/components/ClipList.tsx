import { useRef, useEffect } from "react";
import { Alert, Col, Row, Spinner } from "react-bootstrap";
import { ClipCard } from "./ClipCard";
import type { ClipsResponse } from "../../../lib/pb_types";

type ClipListProps = {
  clips: ClipsResponse[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  onClipClick?: (clip: ClipsResponse) => void;
};

export function ClipList({
  clips,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onClipClick,
}: ClipListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  if (isLoading) {
    return (
      <div className="d-flex align-items-center gap-2 text-muted">
        <Spinner animation="border" size="sm" />
        <span>Loading clips…</span>
      </div>
    );
  }

  if (isError) {
    return <Alert variant="danger">Failed to load clips.</Alert>;
  }

  if (!clips.length) {
    return <Alert variant="light">No clips yet.</Alert>;
  }

  return (
    <>
      <Row xs={1} md={2} lg={3} className="g-3">
        {clips.map((clip) => (
          <Col key={clip.id}>
            <ClipCard clip={clip} onClick={onClipClick} />
          </Col>
        ))}
      </Row>

      {/* スクロール検知用の sentinel */}
      <div ref={sentinelRef} className="d-flex justify-content-center py-3">
        {isFetchingNextPage ? (
          <Spinner animation="border" size="sm" />
        ) : hasNextPage ? (
          <span className="text-muted small">Scroll for more</span>
        ) : null}
      </div>
    </>
  );
}