import { useState } from "react";
import { OverlayTrigger, Popover, Spinner, Image } from "react-bootstrap";
import { BarChart3, FileText, Image as ImageIcon, File } from "lucide-react";
import type { ClipsResponse } from "../../../lib/pb_types";
import { pb } from "../../../lib/pocketbase";
import { useClipsByIds } from "../hooks/useClipsByIds";
import { ClipDetailModal } from "./ClipDetailModal";
import "./ClipsPopover.css";

type ClipsPopoverProps = {
  /** 紐づいている clip の ID 一覧 */
  clipIds: string[];
  /** トリガーとなる要素（バッジ等） */
  children: React.ReactNode;
};

const TYPE_ICONS = {
  text: FileText,
  image: ImageIcon,
  file: File,
  data: BarChart3,
} as const;

function getThumbnailUrl(clip: ClipsResponse) {
  if (!clip.file) return null;
  return `${pb.baseURL}/api/files/${clip.collectionId}/${clip.id}/${clip.file}?thumb=100x100`;
}

export function ClipsPopover({ clipIds, children }: ClipsPopoverProps) {
  const [show, setShow] = useState(false);
  const [viewingClip, setViewingClip] = useState<ClipsResponse | null>(null);

  // ポップオーバーが開かれた時だけフェッチ
  const { data: clips, isLoading } = useClipsByIds(clipIds, show);

  function handleClipClick(clip: ClipsResponse) {
    setShow(false);
    setViewingClip(clip);
  }

  const popover = (
    <Popover className="clips-popover">
      <Popover.Body className="clips-popover-body">
        {isLoading ? (
          <div className="clips-popover-loading">
            <Spinner animation="border" size="sm" />
          </div>
        ) : !clips || clips.length === 0 ? (
          <p className="clips-popover-empty">クリップがありません</p>
        ) : (
          clips.map((clip) => {
            const clipType = clip.kind;
            const TypeIcon = TYPE_ICONS[clipType];
            const thumbnailUrl =
              clipType === "image" ? getThumbnailUrl(clip) : null;

            return (
              <button
                key={clip.id}
                type="button"
                className="clips-popover-item"
                onClick={() => handleClipClick(clip)}
                title={clip.name}
              >
                {thumbnailUrl ? (
                  <Image
                    src={thumbnailUrl}
                    alt=""
                    className="clips-popover-thumb"
                  />
                ) : (
                  <span className="clips-popover-icon">
                    <TypeIcon size={16} />
                  </span>
                )}
                <span className="clips-popover-name">{clip.name}</span>
              </button>
            );
          })
        )}
      </Popover.Body>
    </Popover>
  );

  return (
    <>
      <OverlayTrigger
        trigger="click"
        placement="bottom"
        show={show}
        onToggle={(nextShow) => setShow(nextShow)}
        overlay={popover}
        rootClose
      >
        {children as React.ReactElement}
      </OverlayTrigger>

      <ClipDetailModal
        clip={viewingClip}
        show={viewingClip !== null}
        onClose={() => setViewingClip(null)}
      />
    </>
  );
}
