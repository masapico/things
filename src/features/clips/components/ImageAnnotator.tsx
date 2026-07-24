import { useCallback, useRef, useState, type MouseEvent } from "react";
import "./ImageAnnotator.css";

export type Annotation = {
  /** 0-1 normalized coordinates relative to the image */
  x: number;
  y: number;
  width: number;
  height: number;
};

type ImageAnnotatorProps = {
  src: string;
  annotations: Annotation[];
  onChange: (annotations: Annotation[]) => void;
  readonly?: boolean;
};

const DRAG_THRESHOLD = 4; // px — minimum mouse movement to count as drag

export function ImageAnnotator({
  src,
  annotations,
  onChange,
  readonly = false,
}: ImageAnnotatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState<Annotation | null>(null);
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });

  // Track ongoing drag of an existing annotation
  const dragRef = useRef<{
    index: number;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  } | null>(null);

  // Track initial mouse position for drag threshold detection
  const initialMouseRef = useRef<{ x: number; y: number } | null>(null);

  const getRelativePos = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return null;
      return {
        x: (clientX - rect.left) / rect.width,
        y: (clientY - rect.top) / rect.height,
      };
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: MouseEvent) => {
      if (readonly) return;
      const pos = getRelativePos(e.clientX, e.clientY);
      if (!pos) return;

      // Check if clicking on an existing annotation
      const clicked = annotations.findIndex(
        (a) =>
          pos.x >= a.x &&
          pos.x <= a.x + a.width &&
          pos.y >= a.y &&
          pos.y <= a.y + a.height,
      );

      if (clicked !== -1) {
        // Start potential drag (or click-to-remove if no drag follows)
        initialMouseRef.current = { x: e.clientX, y: e.clientY };
        dragRef.current = {
          index: clicked,
          offsetX: pos.x - annotations[clicked].x,
          offsetY: pos.y - annotations[clicked].y,
          moved: false,
        };
        return;
      }

      // Start drawing a new rectangle
      setDrawing({ x: pos.x, y: pos.y, width: 0, height: 0 });
    },
    [readonly, getRelativePos, annotations],
  );

  const handlePointerMove = useCallback(
    (e: MouseEvent) => {
      // Dragging an existing annotation
      if (dragRef.current) {
        const pos = getRelativePos(e.clientX, e.clientY);
        if (!pos) return;

        // Check if mouse has moved enough to count as drag
        if (
          !dragRef.current.moved &&
          initialMouseRef.current &&
          (Math.abs(e.clientX - initialMouseRef.current.x) > DRAG_THRESHOLD ||
            Math.abs(e.clientY - initialMouseRef.current.y) > DRAG_THRESHOLD)
        ) {
          dragRef.current.moved = true;
        }

        if (dragRef.current.moved) {
          const updated = [...annotations];
          updated[dragRef.current.index] = {
            ...updated[dragRef.current.index],
            x: Math.max(0, Math.min(1, pos.x - dragRef.current.offsetX)),
            y: Math.max(0, Math.min(1, pos.y - dragRef.current.offsetY)),
          };
          onChange(updated);
        }
        return;
      }

      // Drawing a new rectangle
      if (!drawing) return;
      const pos = getRelativePos(e.clientX, e.clientY);
      if (!pos) return;
      setDrawing({
        ...drawing,
        width: pos.x - drawing.x,
        height: pos.y - drawing.y,
      });
    },
    [drawing, getRelativePos, annotations, onChange],
  );

  const handlePointerUp = useCallback(() => {
    // Dragging or clicking an existing annotation
    if (dragRef.current) {
      if (!dragRef.current.moved) {
        // Click without drag → remove the annotation
        onChange(annotations.filter((_, i) => i !== dragRef.current!.index));
      }
      dragRef.current = null;
      initialMouseRef.current = null;
      return;
    }

    // Finished drawing a new rectangle
    if (!drawing) return;
    const x = Math.min(drawing.x, drawing.x + drawing.width);
    const y = Math.min(drawing.y, drawing.y + drawing.height);
    const w = Math.abs(drawing.width);
    const h = Math.abs(drawing.height);

    // Only add if it's bigger than ~0.5% of the image area
    if (w * h > 0.000025) {
      onChange([...annotations, { x, y, width: w, height: h }]);
    }
    setDrawing(null);
  }, [drawing, onChange, annotations]);

  const handleMouseLeave = useCallback(() => {
    dragRef.current = null;
    initialMouseRef.current = null;
    setDrawing(null);
  }, []);

  const activeDrawing = drawing
    ? {
        x: Math.min(drawing.x, drawing.x + drawing.width),
        y: Math.min(drawing.y, drawing.y + drawing.height),
        w: Math.abs(drawing.width),
        h: Math.abs(drawing.height),
      }
    : null;

  const nw = imgNatural.w || 1;
  const nh = imgNatural.h || 1;

  return (
    <div
      ref={containerRef}
      className={`image-annotator ${readonly ? "image-annotator--readonly" : ""}`}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handleMouseLeave}
    >
      <img
        src={src}
        alt="Annotate"
        onLoad={(e) => {
          const img = e.currentTarget;
          setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
        }}
        draggable={false}
      />
      <svg
        className="image-annotator-svg"
        viewBox={`0 0 ${nw} ${nh}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {annotations.map((a, i) => (
          <rect
            key={i}
            x={a.x * nw}
            y={a.y * nh}
            width={a.width * nw}
            height={a.height * nh}
            className="image-annotator-rect"
          />
        ))}
        {activeDrawing && (
          <rect
            x={activeDrawing.x * nw}
            y={activeDrawing.y * nh}
            width={activeDrawing.w * nw}
            height={activeDrawing.h * nh}
            className="image-annotator-drawing"
          />
        )}
      </svg>
      {!readonly && (
        <div className="image-annotator-hint">
          Drag to highlight · Drag existing highlight to move · Click to remove
        </div>
      )}
    </div>
  );
}