import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Form, Modal } from "react-bootstrap";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileIcon,
  FileTextIcon,
  ImageIcon,
  PenLineIcon,
  Trash2Icon,
  CheckCircle2Icon,
  AlertCircleIcon,
} from "lucide-react";
import type { ClipsResponse } from "../../../lib/pb_types";
import { pb } from "../../../lib/pocketbase";
import { updateClip, deleteClip } from "../api";
import { ImageAnnotator, type Annotation } from "./ImageAnnotator";
import "./ClipRegister.css";
import "./ClipDetailModal.css";

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

function getClipType(clip: ClipsResponse): "text" | "image" | "file" {
  if (clip.file) {
    const ext = getFileExtension(clip.file);
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

const TYPE_META = {
  text: { label: "Text", icon: FileTextIcon },
  image: { label: "Image", icon: ImageIcon },
  file: { label: "File", icon: FileIcon },
} as const;

export function ClipDetailModal({ clip, show, onClose }: ClipDetailModalProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editText, setEditText] = useState("");
  const [editAnnotations, setEditAnnotations] = useState<Annotation[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusKind, setStatusKind] = useState<"success" | "error">("success");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasUnsavedAnnotations, setHasUnsavedAnnotations] = useState(false);
  const prevClipIdRef = useRef<string | undefined>(undefined);

  // Track the latest saved data for the readonly view — this persists
  // across edit cycles so the readonly view doesn't rely on the stale `clip` prop.
  const [savedAnnotations, setSavedAnnotations] = useState<Annotation[]>([]);
  const [savedText, setSavedText] = useState("");

  // Reset local state when the clip changes (before render, not in an effect)
  if (clip?.id !== prevClipIdRef.current) {
    prevClipIdRef.current = clip?.id;
    setIsEditing(false);
    setShowDeleteConfirm(false);
    setStatusMessage("");
    setHasUnsavedAnnotations(false);
    setSavedAnnotations(
      clip?.annotations && Array.isArray(clip.annotations)
        ? clip.annotations
        : [],
    );
    setSavedText(clip?.text ?? "");
  }

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(""), 3200);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  if (!clip) return null;

  const clipType = getClipType(clip);
  const { label: typeLabel, icon: TypeIcon } = TYPE_META[clipType];
  // Use saved state for the readonly view to stay up to date after saving
  // while the `clip` prop is still stale.
  const readonlyText = savedText || clip.text || "";
  const readonlyAnnotations: Annotation[] = savedAnnotations.length > 0
    ? savedAnnotations
    : clip.annotations && Array.isArray(clip.annotations)
      ? clip.annotations
      : [];
  const fullFileUrl = clip.file
    ? `${pb.baseURL}/api/files/${clip.collectionId}/${clip.id}/${clip.file}`
    : null;

  const handleEnterEdit = () => {
    setEditName(clip.name);
    setEditText(readonlyText);
    setEditAnnotations(readonlyAnnotations);
    setHasUnsavedAnnotations(false);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data: Record<string, unknown> = {};
      data.name = editName.trim() || clip.name;
      if (clipType === "text") {
        data.text = editText;
      }
      if (hasUnsavedAnnotations) {
        data.annotations = JSON.stringify(editAnnotations);
      }
      await updateClip(clip.id, data as { name?: string; text?: string });
      queryClient.invalidateQueries({ queryKey: ["clips"] });
      // Persist the saved data so the readonly view stays up to date
      // even though the `clip` prop is still stale.
      if (hasUnsavedAnnotations) {
        setSavedAnnotations(editAnnotations);
      }
      if (clipType === "text") {
        setSavedText(editText);
      }
      setIsEditing(false);
      setStatusKind("success");
      setStatusMessage("Clip updated.");
    } catch (error) {
      console.error("Failed to update clip:", error);
      setStatusKind("error");
      setStatusMessage("Failed to update clip.");
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
      setStatusMessage("Failed to delete clip.");
    }
  };

  const handleCancelEdit = () => {
    setEditName(clip.name);
    setEditText(readonlyText);
    setEditAnnotations(readonlyAnnotations);
    setHasUnsavedAnnotations(false);
    setIsEditing(false);
  };

  const handleDownload = () => {
    if (fullFileUrl) {
      window.open(fullFileUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleAnnotationsChange = (updated: Annotation[]) => {
    setEditAnnotations(updated);
    setHasUnsavedAnnotations(true);
  };

  return (
    <>
      {statusMessage ? (
        <div
          className={`clip-status ${statusKind === "success" ? "clip-status--success" : "clip-status--error"}`}
          role="status"
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
        onHide={onClose}
        centered
        className="clip-modal"
      >
        <Modal.Header closeButton className="clip-modal-header">
          <div className="clip-header-row w-100">
            <div className="clip-header-icon">
              <TypeIcon size={20} />
            </div>
            <div>
              <Modal.Title className="clip-title">
                {isEditing ? "Edit clip" : clip.name}
              </Modal.Title>
              <p className="clip-subtitle">
                {isEditing
                  ? "Make your changes, then save."
                  : `Created ${formatDate(clip.created)}`}
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
                <Form.Label className="clip-field-label">Title</Form.Label>
                <Form.Control
                  className="clip-title-input"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Clip name"
                />
              </Form.Group>

              {clipType === "text" ? (
                <Form.Group className="mb-3">
                  <Form.Label className="clip-field-label">Content</Form.Label>
                  <div className="clip-pad-wrap">
                    <Form.Control
                      as="textarea"
                      rows={10}
                      className="clip-pad-textarea"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                  </div>
                </Form.Group>
              ) : null}

              {/* Editable image annotations */}
              {clipType === "image" && fullFileUrl ? (
                <Form.Group className="mb-3">
                  <Form.Label className="clip-field-label">
                    Annotations
                  </Form.Label>
                  <div className="clip-image-card">
                    <ImageAnnotator
                      src={fullFileUrl}
                      annotations={editAnnotations}
                      onChange={handleAnnotationsChange}
                    />
                  </div>
                </Form.Group>
              ) : null}
            </>
          ) : (
            <>
              {/* Text content */}
              {readonlyText ? (
                <div className="mb-3">
                  <Form.Label className="clip-field-label">Note</Form.Label>
                  <div className="clip-pad-wrap clip-pad-preview">
                    <div className="clip-markdown-body">
                      <Markdown remarkPlugins={[remarkGfm]}>
                        {readonlyText}
                      </Markdown>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Image with annotations (readonly) */}
              {clipType === "image" && fullFileUrl ? (
                <div className="mb-3">
                  <Form.Label className="clip-field-label">Image</Form.Label>
                  <div className="clip-image-card">
                    <ImageAnnotator
                      src={fullFileUrl}
                      annotations={readonlyAnnotations}
                      onChange={() => {}}
                      readonly
                    />
                  </div>
                </div>
              ) : null}

              {/* File info */}
              {clipType === "file" && clip.file ? (
                <div className="mb-3">
                  <Form.Label className="clip-field-label">File</Form.Label>
                  <div
                    className="clip-file-card"
                    role="button"
                    tabIndex={0}
                    onClick={handleDownload}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleDownload();
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="clip-file-icon">
                      <FileIcon size={20} />
                    </div>
                    <div>
                      <div className="clip-file-name">{clip.file}</div>
                      <div className="clip-file-meta">
                        Click to download or open
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Info row */}
              <div className="clip-detail-info small">
                <span>Created: {formatDate(clip.created)}</span>
                {clip.created !== clip.updated ? (
                  <span> · Updated: {formatDate(clip.updated)}</span>
                ) : null}
              </div>
            </>
          )}
        </Modal.Body>

        <Modal.Footer className="d-flex justify-content-between">
          <div>
            {isEditing ? (
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="clip-btn-delete"
                disabled={isSaving}
              >
                <Trash2Icon size={14} />
                Delete
              </Button>
            ) : null}
          </div>

          <div className="d-flex gap-2">
            {isEditing ? (
              <>
                <Button className="clip-btn-cancel" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button
                  className="clip-btn-save"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving…" : "Save changes"}
                </Button>
              </>
            ) : (
              <>
                <Button className="clip-btn-cancel" onClick={onClose}>
                  Close
                </Button>
                <Button className="clip-btn-save" onClick={handleEnterEdit}>
                  <PenLineIcon size={14} />
                  Edit
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
            <Modal.Title className="clip-title">Delete clip</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              Are you sure you want to delete "{clip.name}"? This cannot be
              undone.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button
              className="clip-btn-cancel"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              className="clip-btn-danger"
            >
              Delete
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
}