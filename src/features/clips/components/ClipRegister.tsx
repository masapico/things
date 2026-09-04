import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Form, Modal } from "react-bootstrap";
import { pb } from "../../../lib/pocketbase";
import {
  ClipboardPlusIcon,
  FileTextIcon,
  ImageIcon,
  FileIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
} from "lucide-react";
import { ImageAnnotator } from "./ImageAnnotator";
import { MarkdownClipEditor } from "./MarkdownClipEditor";
import { EMPTY_ANNOTATION_DOCUMENT } from "../annotations/annotationModel";
import type { AnnotationDocument } from "../annotations/annotationModel";
import "./ClipRegister.css";

type ClipType = "text" | "image" | "file";

const TYPE_META: Record<
  ClipType,
  { label: string; icon: typeof FileTextIcon }
> = {
  text: { label: "テキスト", icon: FileTextIcon },
  image: { label: "画像", icon: ImageIcon },
  file: { label: "ファイル", icon: FileIcon },
};

export function ClipRegister() {
  const [showModal, setShowModal] = useState(false);
  const [clipType, setClipType] = useState<ClipType>("text");
  const [textContent, setTextContent] = useState("");
  const [fileContent, setFileContent] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [title, setTitle] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusKind, setStatusKind] = useState<"success" | "error">("success");
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [annotations, setAnnotations] = useState<AnnotationDocument>(EMPTY_ANNOTATION_DOCUMENT);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (window.location.pathname.startsWith("/clips/data/")) return;
      if (document.querySelector(".modal.show")) return;

      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA"].includes(target?.tagName ?? "");

      if (isEditable) {
        return;
      }

      const items = event.clipboardData?.items;
      if (!items?.length) {
        return;
      }

      for (const item of items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            setFileContent(file);
            setClipType(file.type.startsWith("image/") ? "image" : "file");
            setTitle(file.name || "Pasted file");
            setTextContent("");
            setStatusMessage("");
            setPreviewUrl((current) => {
              if (current) {
                URL.revokeObjectURL(current);
              }
              return URL.createObjectURL(file);
            });
            setShowModal(true);
            event.preventDefault();
            return;
          }
        }

        if (item.kind === "string" && item.type === "text/plain") {
          item.getAsString((text) => {
            setTextContent(text);
            setClipType("text");
            setFileContent(null);
            setTitle("Pasted text");
            setStatusMessage("");
            setPreviewUrl((current) => {
              if (current) {
                URL.revokeObjectURL(current);
              }
              return "";
            });
          });
          event.preventDefault();
          setShowModal(true);
          return;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(""), 3200);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  const resetState = () => {
    setShowModal(false);
    setTextContent("");
    setFileContent(null);
    setClipType("text");
    setTitle("");
    setAnnotations(EMPTY_ANNOTATION_DOCUMENT);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return "";
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const safeTitle =
        title.trim() ||
        (clipType === "text"
          ? "Pasted text"
          : fileContent?.name || "Pasted clip");
      const hasFileAttachment = clipType !== "text" && fileContent !== null;

      const data: Record<string, unknown> = {
        name: safeTitle,
        kind: clipType,
      };

      if (clipType === "text") {
        data.text = textContent;
      } else if (hasFileAttachment) {
        data.file = fileContent;
        data.filename = fileContent.name;

        if (clipType === "image" && annotations.items.length > 0) {
          data.annotations = annotations;
        }
      }

      await pb.collection("clips").create(data);
      queryClient.invalidateQueries({ queryKey: ["clips"] });
      resetState();
      setStatusKind("success");
      setStatusMessage("Clip saved.");
    } catch (error) {
      console.error("Failed to save clip:", error);
      setStatusKind("error");
      setStatusMessage("クリップを保存できませんでした。もう一度お試しください。");
    } finally {
      setIsSaving(false);
    }
  };

  const { label: typeLabel, icon: TypeIcon } = TYPE_META[clipType];

  return (
    <div className="clip-composer">
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
        show={showModal}
        size="xl"
        onHide={resetState}
        centered
        className="clip-modal"
      >
        <Modal.Header closeButton className="clip-modal-header">
          <div className="clip-header-row w-100">
            <div className="clip-header-icon">
              <ClipboardPlusIcon size={20} />
            </div>
            <div>
              <Modal.Title className="clip-title">クリップを登録</Modal.Title>
              <p className="clip-subtitle">名前と内容を確認して保存してください。</p>
            </div>
            <span className="clip-type-badge">
              <TypeIcon size={12} />
              {typeLabel}
            </span>
          </div>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className="clip-field-label">タイトル</Form.Label>
            <Form.Control
              className="clip-title-input"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="クリップ名"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="clip-field-label">内容</Form.Label>

            {clipType === "text" ? (
              <MarkdownClipEditor value={textContent} onChange={setTextContent} placeholder="貼り付けた内容" />
            ) : null}

            {clipType === "image" ? (
              <div className="clip-image-card">
                <ImageAnnotator
                  src={previewUrl}
                  value={annotations}
                  onChange={setAnnotations}
                />
              </div>
            ) : null}

            {clipType === "file" ? (
              <div className="clip-file-card">
                <div className="clip-file-icon">
                  <FileIcon size={20} />
                </div>
                <div>
                  <div className="clip-file-name">
                    {fileContent?.name ?? "ファイル"}
                  </div>
                  {fileContent?.size ? (
                    <div className="clip-file-meta">
                      {Math.round(fileContent.size / 1024)} KB
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button className="clip-btn-cancel" onClick={resetState}>
            キャンセル
          </Button>
          <Button
            className="clip-btn-save"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "保存中…" : "クリップを保存"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ClipRegister;
