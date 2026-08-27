import { useRef, useEffect } from "react";
import { Button, Col, Row, Spinner } from "react-bootstrap";
import { ClipCard } from "./ClipCard";
import type { ClipsResponse } from "../../../lib/pb_types";
import { AsyncState } from "../../../components/AsyncState";

type ClipListProps = {
  clips: ClipsResponse[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  isFetchNextPageError?: boolean;
  onLoadMore?: () => void;
  onRetry?: () => void;
  onClipClick?: (clip: ClipsResponse) => void;
};

export function ClipList({
  clips,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  onLoadMore,
  onRetry,
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
    return <AsyncState kind="loading" message="クリップを読み込んでいます…" />;
  }

  if (isError) {
    return <AsyncState kind="error" message="クリップを読み込めませんでした。" onRetry={onRetry} />;
  }

  if (!clips.length) {
    return <AsyncState kind="empty" message="クリップはまだありません。画面上でテキスト・画像・ファイルを貼り付けると登録できます。" />;
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
        ) : isFetchNextPageError ? (
          <Button variant="outline-primary" size="sm" onClick={onLoadMore}>続きを再読み込み</Button>
        ) : hasNextPage ? (
          <span className="text-muted small">スクロールして続きを表示</span>
        ) : null}
      </div>
    </>
  );
}
