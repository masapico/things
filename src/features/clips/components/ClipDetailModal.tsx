import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Form, Modal } from "react-bootstrap";
import {
  FileIcon,
  FileTextIcon,
  ImageIcon,
  PenLineIcon,
  Trash2Icon,
  CheckCircle2Icon,
  AlertCircleIcon,
  DownloadIcon,
  ExternalLinkIcon,
  BarChart3,
} from "lucide-react";
import type { ClipsResponse } from "../../../lib/pb_types";
import type { Update } from "../../../lib/pb_types";
import { pb } from "../../../lib/pocketbase";
import { updateClip, deleteClip } from "../api";
import { ImageAnnotator } from "./ImageAnnotator";
import { MarkdownClipEditor } from "./MarkdownClipEditor";
import { MarkdownWithMermaid } from "./MarkdownWithMermaid";
import { PdfThumbnail } from "./PdfThumbnail";
import { EMPTY_ANNOTATION_DOCUMENT, parseAnnotationDocument } from "../annotations/annotationModel";
import type { AnnotationDocument } from "../annotations/annotationModel";
import "./ClipRegister.css";
import "./ClipDetailModal.css";
import "../data/dataClip.css";

const DataClipViewer = lazy(() => import("../data/DataClipViewer").then((module) => ({ default: module.DataClipViewer })));

type ClipDetailModalProps = {
  clip: ClipsResponse | null;
  show: boolean;
  onClose: () => void;
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

function getFileExtension(fileName?: string) {
  if (!fileName) return null;
  const match = fileName.match(/\.([A-Za-z0-9]+)$/);
  return match ? match[1].toUpperCase() : null;
}

function getDisplayFileName(clip: ClipsResponse) {
  return clip.filename || clip.file;
}

const TYPE_META = {
  text: { label: "テキスト", icon: FileTextIcon },
  image: { label: "画像", icon: ImageIcon },
  file: { label: "ファイル", icon: FileIcon },
  data: { label: "データ", icon: BarChart3 },
} as const;

export function ClipDetailModal({ clip, show, onClose }: ClipDetailModalProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editText, setEditText] = useState("");
  const [editAnnotations, setEditAnnotations] = useState<AnnotationDocument>(EMPTY_ANNOTATION_DOCUMENT);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusKind, setStatusKind] = useState<"success" | "error">("success");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasUnsavedAnnotations, setHasUnsavedAnnotations] = useState(false);
  const prevClipIdRef = useRef<string | undefined>(undefined);

  // Track the latest saved data for the readonly view — this persists
  // across edit cycles so the readonly view doesn't rely on the stale `clip` prop.
  const [savedAnnotations, setSavedAnnotations] = useState<AnnotationDocument>(EMPTY_ANNOTATION_DOCUMENT);
  const [savedText, setSavedText] = useState("");
  const [savedName, setSavedName] = useState("");

  // Reset local state when the clip changes (before render, not in an effect)
  if (clip?.id !== prevClipIdRef.current) {
    prevClipIdRef.current = clip?.id;
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setStatusMessage("");
    setHasUnsavedAnnotations(false);
    setSavedAnnotations(parseAnnotationDocument(clip?.annotations));
    setSavedText(clip?.text ?? "");
    setSavedName(clip?.name ?? "");
  }

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(""), 3200);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  if (!clip) return null;

  const clipType = clip.kind;
  const { label: typeLabel, icon: TypeIcon } = TYPE_META[clipType];
  // Use saved state for the readonly view to stay up to date after saving
  // while the `clip` prop is still stale.
  const readonlyText = savedText;
  const readonlyName = savedName;
  const readonlyAnnotations = savedAnnotations;
  const fullFileUrl = clip.file
    ? `${pb.baseURL}/api/files/${clip.collectionId}/${clip.id}/${clip.file}`
    : null;
  const isPdf = clipType === "file" && getFileExtension(getDisplayFileName(clip)) === "PDF";

  const isDirty =
    isEditing &&
    (editName !== readonlyName ||
      (clipType === "text" && editText !== readonlyText) ||
      hasUnsavedAnnotations);

  const requestClose = () => {
    if (isDirty) {
      const ok = window.confirm("未保存の変更があります。破棄して閉じますか？");
      if (!ok) return;
    }
    onClose();
  };

  const handleEnterEdit = () => {
    setEditName(readonlyName);
    setEditText(readonlyText);
    setEditAnnotations(readonlyAnnotations);
    setHasUnsavedAnnotations(false);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data: Update<"clips"> = {};
      data.name = editName.trim() || readonlyName;
      if (clipType === "text") {
        data.text = editText;
      }
      if (hasUnsavedAnnotations) {
        data.annotations = editAnnotations;
      }
      const updatedClip = await updateClip(clip.id, data);
      queryClient.invalidateQueries({ queryKey: ["clips"] });
      // Persist the saved data so the readonly view stays up to date
      // even though the `clip` prop is still stale.
      if (hasUnsavedAnnotations) {
        setSavedAnnotations(editAnnotations);
      }
      if (clipType === "text") {
        setSavedText(editText);
      }
      setSavedName(updatedClip.name);
      setIsEditing(false);
      setStatusKind("success");
      setStatusMessage("Clip updated.");
    } catch (error) {
      console.error("Failed to update clip:", error);
      setStatusKind("error");
      setStatusMessage("クリップを更新できませんでした。もう一度お試しください。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteClip(clip.id);
      queryClient.invalidateQueries({ queryKey: ["clips"] });
      onClose();
      setStatusKind("success");
      setStatusMessage("Clip deleted.");
    } catch (error) {
      console.error("Failed to delete clip:", error);
      setStatusKind("error");
      setStatusMessage("クリップを削除できませんでした。もう一度お試しください。");
    }
  };

  const handleCancelEdit = () => {
    setEditName(readonlyName);
    setEditText(readonlyText);
    setEditAnnotations(readonlyAnnotations);
    setHasUnsavedAnnotations(false);
    setIsEditing(false);
  };

  const handleOpen = () => {
    if (fullFileUrl) {
      window.open(fullFileUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownload = async () => {
    if (!fullFileUrl) return;
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
    } catch (error) {
      console.error("Failed to download file:", error);
      // フォールバック: 直接開く
      window.open(fullFileUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleAnnotationsChange = (updated: AnnotationDocument) => {
    setEditAnnotations(updated);
    setHasUnsavedAnnotations(true);
  };

  // キーボードショートカット: Cmd/Ctrl+S で保存、編集中の Esc でキャンセル
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      if (isEditing && !isSaving) {
        void handleSave();
      }
      return;
    }
    if (e.key === "Escape") {
      if (isEditing) {
        e.stopPropagation();
        handleCancelEdit();
      } else {
        requestClose();
      }
    }
  };

  return (
    <>
      {statusMessage ? (
        <div
          className={`clip-status ${statusKind === "success" ? "clip-status--success" : "clip-status--error"}`}
          role={statusKind === "success" ? "status" : "alert"}
        >
          {statusKind === "success" ? (
            <CheckCircle2Icon size={16} />
          ) : (
            <AlertCircleIcon size={16} />
          )}
          {statusMessage}
        </div>
      ) : null}

      <Modal
        key={clip.id}
        show={show}
        size="xl"
        onHide={requestClose}
        centered
        className="clip-modal"
        onKeyDown={handleKeyDown}
      >
        <Modal.Header closeButton className="clip-modal-header">
          <div className="clip-header-row w-100">
            <div className="clip-header-icon">
              <TypeIcon size={20} />
            </div>
            <div>
              <Modal.Title className="clip-title">
                {isEditing ? "クリップを編集" : readonlyName}
              </Modal.Title>
              <p className="clip-subtitle">
                {isEditing
                  ? "変更内容を確認して保存してください。"
                  : `作成 ${formatDate(clip.created)}`}
              </p>
            </div>
            <span className="clip-type-badge">
              <TypeIcon size={12} />
              {typeLabel}
            </span>
          </div>
        </Modal.Header>

        <Modal.Body>
          {isEditing ? (
            <>
              <Form.Group className="mb-3">
                <Form.Label className="clip-field-label">タイトル</Form.Label>
                <Form.Control
                  className="clip-title-input"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="クリップ名"
                />
              </Form.Group>

              {clipType === "text" ? (
                <Form.Group className="mb-3">
                  <MarkdownClipEditor value={editText} onChange={setEditText} placeholder="内容を入力" />
                </Form.Group>
              ) : null}

              {/* Editable image annotations */}
              {clipType === "image" && fullFileUrl ? (
                <Form.Group className="mb-3">
                  <Form.Label className="clip-field-label">
                    注釈
                  </Form.Label>
                  <div className="clip-image-card clip-image-card--readonly">
                    <ImageAnnotator
                      src={fullFileUrl}
                      value={editAnnotations}
                      onChange={handleAnnotationsChange}
                    />
                  </div>
                </Form.Group>
              ) : null}
            </>
          ) : (
            <>
              {clipType === "data" ? (
                <Suspense fallback={<div className="py-5 text-center">データを読み込んでいます…</div>}>
                  <DataClipViewer clipId={clip.id} name={readonlyName} value={clip.data} />
                </Suspense>
              ) : null}
              {/* Text content */}
              {clipType === "text" && readonlyText ? (
                <div className="mb-3">
                  <Form.Label className="clip-field-label">メモ</Form.Label>
                  <div className="clip-pad-wrap clip-pad-preview">
                    <div className="clip-markdown-body">
                      <MarkdownWithMermaid>{readonlyText}</MarkdownWithMermaid>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Image with annotations (readonly) */}
              {clipType === "image" && fullFileUrl ? (
                <div className="mb-3">
                  <Form.Label className="clip-field-label">画像</Form.Label>
                  <div className="clip-image-card">
                    <ImageAnnotator
                      src={fullFileUrl}
                      value={readonlyAnnotations}
                      onChange={() => {}}
                      readonly
                    />
                    <Button
                      variant="light"
                      size="sm"
                      className="clip-asset-action clip-asset-action--overlay"
                      onClick={handleOpen}
                      aria-label="元画像を開く"
                      title="元画像を開く"
                    >
                      <ExternalLinkIcon size={16} />
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* File info */}
              {clipType === "file" && clip.file ? (
                <div className="mb-3">
                  <Form.Label className="clip-field-label">
                    {isPdf ? "PDFプレビュー" : "ファイル"}
                  </Form.Label>
                  {isPdf && fullFileUrl ? (
                    <div className="mb-3">
                      <PdfThumbnail
                        url={fullFileUrl}
                        title={readonlyName}
                        variant="modal"
                      />
                    </div>
                  ) : null}
                  <div className="clip-file-card">
                    <div className="clip-file-icon">
                      <FileIcon size={20} />
                    </div>
                    <div className="clip-file-copy">
                      <div className="clip-file-name">
                        {getDisplayFileName(clip)}
                      </div>
                    </div>
                    <div className="clip-file-actions" aria-label="ファイル操作">
                      <Button
                        variant="light"
                        size="sm"
                        className="clip-asset-action"
                        onClick={handleOpen}
                        aria-label="ファイルを開く"
                        title="開く"
                      >
                        <ExternalLinkIcon size={16} />
                      </Button>
                      <Button
                        variant="light"
                        size="sm"
                        className="clip-asset-action"
                        onClick={handleDownload}
                        aria-label="ファイルをダウンロード"
                        title="ダウンロード"
                      >
                        <DownloadIcon size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Info row */}
              <div className="clip-detail-info small">
                <span>作成: {formatDate(clip.created)}</span>
                {clip.created !== clip.updated ? (
                  <span> · 更新: {formatDate(clip.updated)}</span>
                ) : null}
              </div>
            </>
          )}
        </Modal.Body>

        <Modal.Footer className="d-flex justify-content-between">
          <div>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="clip-btn-delete"
              disabled={isSaving}
            >
              <Trash2Icon size={14} />
              削除
            </Button>
          </div>

          <div className="d-flex gap-2">
            {isEditing ? (
              <>
                <Button className="clip-btn-cancel" onClick={handleCancelEdit}>
                  キャンセル
                </Button>
                <Button
                  className="clip-btn-save"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? "保存中…" : "変更を保存"}
                </Button>
              </>
            ) : (
              <>
                <Button className="clip-btn-cancel" onClick={requestClose}>
                  閉じる
                </Button>
                <Button className="clip-btn-save" onClick={handleEnterEdit} hidden={clipType === "data"}>
                  <PenLineIcon size={14} />
                  編集
                </Button>
              </>
            )}
          </div>
        </Modal.Footer>
      </Modal>

      {/* Delete confirmation — inside main Modal's key scope */}
      {show && clip && (
        <Modal
          show={showDeleteConfirm}
          onHide={() => setShowDeleteConfirm(false)}
          centered
          size="sm"
        >
          <Modal.Header closeButton className="clip-modal-header">
            <Modal.Title className="clip-title">クリップを削除</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              「{clip.name}」を削除しますか？この操作は取り消せません。
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button
              className="clip-btn-cancel"
              onClick={() => setShowDeleteConfirm(false)}
            >
              キャンセル
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              className="clip-btn-danger"
            >
              削除
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
}
