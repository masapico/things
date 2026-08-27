import { useEffect, useRef, useState } from "react";
import { FileTextIcon } from "lucide-react";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import "./PdfThumbnail.css";

type PdfThumbnailProps = {
  url: string;
  title: string;
  variant?: "card" | "modal";
};

type PreviewState = "idle" | "loading" | "ready" | "error";

export function PdfThumbnail({ url, title, variant = "card" }: PdfThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const [state, setState] = useState<PreviewState>("idle");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldRender) return;

    let disposed = false;
    let renderTask: { cancel: () => void } | undefined;
    let loadingTask: { destroy: () => Promise<void> } | undefined;

    async function renderFirstPage() {
      setState("loading");
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

        const task = pdfjs.getDocument({ url });
        loadingTask = task;
        const document = await task.promise;
        const page = await document.getPage(1);
        if (disposed) return;

        const canvas = canvasRef.current;
        const container = containerRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !container || !context) {
          throw new Error("PDF preview canvas is unavailable");
        }

        const initialViewport = page.getViewport({ scale: 1 });
        const desiredWidth = Math.max(container.clientWidth - 16, 240);
        const viewport = page.getViewport({
          scale: desiredWidth / initialViewport.width,
        });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const taskRender = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform:
            outputScale === 1
              ? undefined
              : [outputScale, 0, 0, outputScale, 0, 0],
        });
        renderTask = taskRender;
        await taskRender.promise;
        if (!disposed) setState("ready");
      } catch (error) {
        if (!disposed && !(error instanceof Error && error.name === "RenderingCancelledException")) {
          console.error("Failed to render PDF preview:", error);
          setState("error");
        }
      }
    }

    void renderFirstPage();
    return () => {
      disposed = true;
      renderTask?.cancel();
      void loadingTask?.destroy();
    };
  }, [shouldRender, url]);

  return (
    <div
      ref={containerRef}
      className={`pdf-preview pdf-preview--${variant}`}
      aria-label={`${title} のPDF表紙`}
    >
      {state !== "ready" ? (
        <div
          className={`pdf-preview-placeholder${state === "loading" ? " pdf-preview-placeholder--loading" : ""}`}
        >
          <FileTextIcon size={30} />
          <span>
            {state === "error" ? "プレビューできません" : "PDFを読み込み中…"}
          </span>
        </div>
      ) : null}
      <canvas
        ref={canvasRef}
        className={state === "ready" ? "" : "d-none"}
        role="img"
        aria-label={`${title} の1ページ目`}
      />
    </div>
  );
}
