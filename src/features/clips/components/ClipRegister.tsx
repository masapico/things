import { useEffect, useState } from "react";
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
import "./ClipRegister.css";

type ClipType = "text" | "image" | "file";

const TYPE_META: Record<
  ClipType,
  { label: string; icon: typeof FileTextIcon }
> = {
  text: { label: "Text", icon: FileTextIcon },
  image: { label: "Image", icon: ImageIcon },
  file: { label: "File", icon: FileIcon },
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
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
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
      const formData = new FormData();
      const safeTitle =
        title.trim() ||
        (clipType === "text"
          ? "Pasted text"
          : fileContent?.name || "Pasted clip");
      const hasFileAttachment = clipType !== "text" && fileContent !== null;

      formData.append("name", safeTitle);

      if (clipType === "text") {
        formData.append("text", textContent);
      } else if (hasFileAttachment) {
        formData.append("file", fileContent, fileContent.name);
      }

      await pb.collection("clips").create(formData);
      resetState();
      setStatusKind("success");
      setStatusMessage("Clip saved.");
    } catch (error) {
      console.error("Failed to save clip:", error);
      setStatusKind("error");
      setStatusMessage("Failed to save the clip. Try again.");
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
              <Modal.Title className="clip-title">Register clip</Modal.Title>
              <p className="clip-subtitle">Give it a name, then save it.</p>
            </div>
            <span className="clip-type-badge">
              <TypeIcon size={12} />
              {typeLabel}
            </span>
          </div>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className="clip-field-label">Title</Form.Label>
            <Form.Control
              className="clip-title-input"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Name this clip"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="clip-field-label">Preview</Form.Label>

            {clipType === "text" ? (
              <div className="clip-pad-wrap">
                <Form.Control
                  as="textarea"
                  rows={7}
                  className="clip-pad-textarea"
                  value={textContent}
                  onChange={(event) => setTextContent(event.target.value)}
                  placeholder="Nothing pasted yet"
                />
              </div>
            ) : null}

            {clipType === "image" ? (
              <div className="clip-image-card">
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{ maxWidth: "100%", maxHeight: "280px" }}
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
                    {fileContent?.name ?? "File"}
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
            Cancel
          </Button>
          <Button
            className="clip-btn-save"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : "Save clip"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ClipRegister;
