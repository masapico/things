import { Badge, Button, Card, Image } from "react-bootstrap";
import { DownloadIcon, ExternalLinkIcon, FileIcon } from "lucide-react";
import type { ClipsResponse } from "../../../lib/pb_types";
import { pb } from "../../../lib/pocketbase";
import "./ClipCard.css";
import { PdfThumbnail } from "./PdfThumbnail";

type ClipCardProps = {
  clip: ClipsResponse;
  onClick?: (clip: ClipsResponse) => void;
};

function formatDate(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeDate(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}日前`;

  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getImageUrl(clip: ClipsResponse) {
  const fileName = clip.file;
  if (!fileName) return null;

  return `${pb.baseURL}/api/files/${clip.collectionId}/${clip.id}/${fileName}`;
}

function getThumbnailUrl(clip: ClipsResponse, size = "100x100") {
  const baseUrl = getImageUrl(clip);
  if (!baseUrl) return null;

  return `${baseUrl}?thumb=${size}`;
}

function getFileExtension(fileName?: string) {
  if (!fileName) return null;

  const match = fileName.match(/\.([A-Za-z0-9]+)$/);
  return match ? match[1].toUpperCase() : null;
}

function getDisplayFileName(clip: ClipsResponse) {
  return clip.filename || clip.file;
}

function getClipType(clip: ClipsResponse): "text" | "image" | "file" {
  if (clip.file) {
    const ext = getFileExtension(getDisplayFileName(clip));
    if (
      ext &&
      ["PNG", "JPG", "JPEG", "GIF", "WEBP", "BMP", "SVG"].includes(ext)
    ) {
      return "image";
    }
    return "file";
  }
  return "text";
}

export function ClipCard({ clip, onClick }: ClipCardProps) {
  const clipType = getClipType(clip);
  // 画像タイプは大きめのサムネイル、それ以外は小さめ
  const thumbnailUrl =
    clipType === "image" ? getThumbnailUrl(clip, "400x300") : null;
  const fullFileUrl = clip.file
    ? `${pb.baseURL}/api/files/${clip.collectionId}/${clip.id}/${clip.file}`
    : null;
  const fullImageUrl = clipType === "image" ? fullFileUrl : null;
  const extension = getFileExtension(getDisplayFileName(clip));

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(clip)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(clip);
        }
      }}
      className="clip-card h-100 text-decoration-none text-reset"
    >
      <Card.Body className="d-flex flex-column gap-2">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <Card.Title as="h2" className="clip-card-title h6 mb-0 flex-grow-1">
            {clip.name}
          </Card.Title>
          {extension && clipType !== "image" ? (
            <Badge className="clip-card-badge" pill>
              {extension}
            </Badge>
          ) : null}
        </div>

        {thumbnailUrl ? (
          <div
            className="clip-card-thumb d-flex justify-content-center align-items-center p-2"
            style={{ minHeight: clipType === "image" ? 180 : 120 }}
          >
            <Image
              src={thumbnailUrl}
              alt={clip.name}
              rounded
              className="img-fluid"
              style={{
                maxHeight: clipType === "image" ? 260 : 100,
                width: "auto",
                objectFit: "contain",
              }}
            />
          </div>
        ) : null}

        {clipType === "file" && extension === "PDF" && fullFileUrl ? (
          <PdfThumbnail url={fullFileUrl} title={clip.name} />
        ) : null}

        {clipType === "file" && extension !== "PDF" ? (
          <div className="clip-card-file-info d-flex align-items-center gap-2">
            <FileIcon size={22} />
            <span className="clip-card-file-name">
              {getDisplayFileName(clip)}
            </span>
          </div>
        ) : null}

        <div className="clip-card-actions">
          {/* 画像タイプ: 「元画像を開く」ボタン */}
          {fullImageUrl ? (
          <Button
            variant="outline-secondary"
            size="sm"
            className="clip-card-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              window.open(fullImageUrl, "_blank", "noopener,noreferrer");
            }}
            title="元画像を開く"
          >
            <ExternalLinkIcon size={13} className="me-1" />
            元画像を開く
          </Button>
        ) : null}

        {/* ファイルタイプ: PDFは開く + ダウンロード、それ以外はダウンロードのみ */}
          {clipType === "file" && fullFileUrl ? (
          <div className="d-flex gap-2">
            {extension === "PDF" ? (
              <Button
                variant="outline-secondary"
                size="sm"
                className="clip-card-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(fullFileUrl, "_blank", "noopener,noreferrer");
                }}
              >
                <ExternalLinkIcon size={13} className="me-1" />
                開く
              </Button>
            ) : null}
            <Button
              variant="outline-secondary"
              size="sm"
              className="clip-card-action-btn"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const response = await fetch(fullFileUrl);
                  if (!response.ok) throw new Error("Download failed");
                  const blob = await response.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = getDisplayFileName(clip) || "download";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch {
                  window.open(fullFileUrl, "_blank", "noopener,noreferrer");
                }
              }}
            >
              <DownloadIcon size={13} className="me-1" />
              ダウンロード
            </Button>
          </div>
        ) : null}
        </div>

        {clip.text ? (
          <div className="clip-card-note">
            <Card.Text className="clip-card-note-text mb-0">
              {clip.text}
            </Card.Text>
          </div>
        ) : null}

        <div className="clip-card-meta small mt-auto">
          <time dateTime={clip.created} title={formatDate(clip.created)}>
            {formatRelativeDate(clip.created)}
          </time>
        </div>
      </Card.Body>
    </Card>
  );
}
