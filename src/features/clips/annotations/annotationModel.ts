export type AnnotationPoint = { x: number; y: number };

export type AnnotationStyle = {
  color: string;
  strokeWidth: number;
};

type AnnotationBase = {
  id: string;
  style: AnnotationStyle;
};

export type RectangleAnnotation = AnnotationBase & {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ArrowAnnotation = AnnotationBase & {
  type: "arrow";
  start: AnnotationPoint;
  end: AnnotationPoint;
};

export type PathAnnotation = AnnotationBase & {
  type: "path";
  points: AnnotationPoint[];
};

export type TextAnnotation = AnnotationBase & {
  type: "text";
  point: AnnotationPoint;
  text: string;
};

export type Annotation =
  | RectangleAnnotation
  | ArrowAnnotation
  | PathAnnotation
  | TextAnnotation;

export type AnnotationDocument = {
  version: 2;
  items: Annotation[];
};

export const EMPTY_ANNOTATION_DOCUMENT: AnnotationDocument = {
  version: 2,
  items: [],
};

export const DEFAULT_ANNOTATION_STYLE: AnnotationStyle = {
  color: "#dc3545",
  strokeWidth: 4,
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function createAnnotationId() {
  return globalThis.crypto?.randomUUID?.() ??
    `annotation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function number(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function point(value: unknown): AnnotationPoint {
  const candidate = value as Partial<AnnotationPoint> | null;
  return {
    x: clamp(number(candidate?.x)),
    y: clamp(number(candidate?.y)),
  };
}

function style(value: unknown): AnnotationStyle {
  const candidate = value as Partial<AnnotationStyle> | null;
  return {
    color:
      typeof candidate?.color === "string"
        ? candidate.color
        : DEFAULT_ANNOTATION_STYLE.color,
    strokeWidth: Math.max(
      1,
      Math.min(12, number(candidate?.strokeWidth, DEFAULT_ANNOTATION_STYLE.strokeWidth)),
    ),
  };
}

function normalizeItem(value: unknown): Annotation | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const base = {
    id: typeof candidate.id === "string" ? candidate.id : createAnnotationId(),
    style: style(candidate.style),
  };

  switch (candidate.type) {
    case "rect": {
      const x = clamp(number(candidate.x));
      const y = clamp(number(candidate.y));
      return {
        ...base,
        type: "rect",
        x,
        y,
        width: Math.min(1 - x, Math.abs(number(candidate.width))),
        height: Math.min(1 - y, Math.abs(number(candidate.height))),
      };
    }
    case "arrow":
      return { ...base, type: "arrow", start: point(candidate.start), end: point(candidate.end) };
    case "path": {
      const points = Array.isArray(candidate.points)
        ? candidate.points.map(point)
        : [];
      return points.length > 1 ? { ...base, type: "path", points } : null;
    }
    case "text":
      return {
        ...base,
        type: "text",
        point: point(candidate.point),
        text: typeof candidate.text === "string" ? candidate.text.slice(0, 500) : "",
      };
    default:
      return null;
  }
}

function migrateLegacy(items: unknown[]): Annotation[] {
  return items.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const item = value as Record<string, unknown>;
    const x = clamp(number(item.x));
    const y = clamp(number(item.y));
    return [{
      id: createAnnotationId(),
      type: "rect" as const,
      x,
      y,
      width: Math.min(1 - x, Math.abs(number(item.width))),
      height: Math.min(1 - y, Math.abs(number(item.height))),
      style: DEFAULT_ANNOTATION_STYLE,
    }];
  });
}

export function parseAnnotationDocument(value: unknown): AnnotationDocument {
  let input = value;
  if (typeof input === "string") {
    try {
      input = JSON.parse(input) as unknown;
    } catch {
      return EMPTY_ANNOTATION_DOCUMENT;
    }
  }

  if (Array.isArray(input)) {
    return { version: 2, items: migrateLegacy(input) };
  }

  if (!input || typeof input !== "object") return EMPTY_ANNOTATION_DOCUMENT;
  const candidate = input as { version?: unknown; items?: unknown };
  if (candidate.version !== 2 || !Array.isArray(candidate.items)) {
    return EMPTY_ANNOTATION_DOCUMENT;
  }

  return {
    version: 2,
    items: candidate.items.flatMap((item) => {
      const normalized = normalizeItem(item);
      return normalized ? [normalized] : [];
    }),
  };
}

export function simplifyPath(points: AnnotationPoint[], tolerance = 0.002) {
  if (points.length < 3) return points;
  const simplified = [points[0]];
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = simplified[simplified.length - 1];
    const current = points[index];
    if (Math.hypot(current.x - previous.x, current.y - previous.y) >= tolerance) {
      simplified.push(current);
    }
  }
  simplified.push(points[points.length - 1]);
  return simplified;
}
