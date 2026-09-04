import { useEffect, useId, useRef, useState } from "react";
import { Alert, Spinner } from "react-bootstrap";
import "./MermaidDiagram.css";

export type MermaidRenderStatus = "idle" | "rendering" | "ready" | "error";

type Props = {
  source: string;
  delay?: number;
  onStatusChange?: (status: MermaidRenderStatus) => void;
};

let mermaidPromise: Promise<(typeof import("mermaid"))["default"]> | null = null;

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        suppressErrorRendering: true,
        theme: "neutral",
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.split("\n").find((line) => line.trim())?.trim() || "Mermaidの構文を確認してください。";
}

export function MermaidDiagram({ source, delay = 0, onStatusChange }: Props) {
  const reactId = useId();
  const requestRef = useRef(0);
  const statusCallbackRef = useRef(onStatusChange);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<MermaidRenderStatus>("idle");

  useEffect(() => {
    statusCallbackRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    const trimmedSource = source.trim();
    const request = ++requestRef.current;

    if (!trimmedSource) {
      Promise.resolve().then(() => {
        if (request !== requestRef.current) return;
        setSvg("");
        setError("");
        setStatus("idle");
      });
      return;
    }

    const timer = window.setTimeout(() => {
      setStatus("rendering");
      void loadMermaid()
        .then((mermaid) => mermaid.render(`mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}-${request}`, trimmedSource))
        .then(({ svg: nextSvg }) => {
          if (request !== requestRef.current) return;
          setSvg(nextSvg);
          setError("");
          setStatus("ready");
        })
        .catch((renderError: unknown) => {
          if (request !== requestRef.current) return;
          setSvg("");
          setError(errorMessage(renderError));
          setStatus("error");
        });
    }, delay);

    return () => window.clearTimeout(timer);
  }, [delay, reactId, source]);

  useEffect(() => {
    statusCallbackRef.current?.(status);
  }, [status]);

  if (!source.trim()) return <div className="mermaid-empty">Mermaidコードを入力してください。</div>;
  if (status === "rendering" && !svg) return <div className="mermaid-loading"><Spinner animation="border" size="sm" /> 図を描画中…</div>;
  if (error) return <Alert variant="danger" className="mermaid-error mb-0">{error}</Alert>;

  return (
    <div
      className="mermaid-diagram"
      role="img"
      aria-label="Mermaidで作成した図"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
