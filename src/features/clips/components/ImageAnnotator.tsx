import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button, ButtonGroup, Form } from "react-bootstrap";
import { ArrowUpRightIcon, BoxSelectIcon, MousePointer2Icon, PencilIcon, Redo2Icon, Trash2Icon, Undo2Icon, ZoomInIcon, ZoomOutIcon } from "lucide-react";
import type { Annotation, AnnotationDocument, AnnotationPoint } from "../annotations/annotationModel";
import { createAnnotationId, DEFAULT_ANNOTATION_STYLE, moveAnnotation, simplifyPath } from "../annotations/annotationModel";
import "./ImageAnnotator.css";

type Tool = "select" | "rect" | "arrow" | "path" | "text";
type Props = { src: string; value: AnnotationDocument; onChange: (value: AnnotationDocument) => void; readonly?: boolean };
type Gesture = { tool: Exclude<Tool, "text"> | "resize"; start: AnnotationPoint; points: AnnotationPoint[]; original?: Annotation };
type TextDraft = { id?: string; point: AnnotationPoint; text: string; style: Annotation["style"] };

const TOOLS = [["select", "選択", MousePointer2Icon], ["rect", "四角", BoxSelectIcon], ["arrow", "矢印", ArrowUpRightIcon], ["path", "手描き", PencilIcon]] as const;
const COLORS = ["#dc3545", "#0d6efd", "#198754", "#212529", "#ffc107"];
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function ImageAnnotator({ src, value, onChange, readonly = false }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const past = useRef<AnnotationDocument[]>([]);
  const future = useRef<AnnotationDocument[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [selectedId, setSelectedId] = useState<string>();
  const [gesture, setGesture] = useState<Gesture>();
  const [pointer, setPointer] = useState<AnnotationPoint>();
  const [zoom, setZoom] = useState(100);
  const [color, setColor] = useState(DEFAULT_ANNOTATION_STYLE.color);
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_ANNOTATION_STYLE.strokeWidth);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [textDraft, setTextDraft] = useState<TextDraft>();

  const commit = useCallback((next: AnnotationDocument) => {
    past.current = [...past.current.slice(-49), value];
    future.current = [];
    onChange(next);
  }, [onChange, value]);
  const pointAt = useCallback((x: number, y: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    return rect ? { x: clamp((x - rect.left) / rect.width), y: clamp((y - rect.top) / rect.height) } : null;
  }, []);
  const undo = useCallback(() => {
    const previous = past.current.at(-1); if (!previous) return;
    past.current = past.current.slice(0, -1); future.current = [value, ...future.current].slice(0, 50); setSelectedId(undefined); setTextDraft(undefined); onChange(previous);
  }, [onChange, value]);
  const redo = useCallback(() => {
    const next = future.current[0]; if (!next) return;
    future.current = future.current.slice(1); past.current = [...past.current.slice(-49), value]; setSelectedId(undefined); setTextDraft(undefined); onChange(next);
  }, [onChange, value]);
  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    commit({ version: 2, items: value.items.filter((item) => item.id !== selectedId) }); setSelectedId(undefined);
  }, [commit, selectedId, value.items]);

  useEffect(() => {
    if (readonly) return;
    const keydown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.matches("input,textarea,[contenteditable=true]")) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      }
      else if (["Delete", "Backspace"].includes(event.key) && selectedId) { event.preventDefault(); removeSelected(); }
    };
    window.addEventListener("keydown", keydown); return () => window.removeEventListener("keydown", keydown);
  }, [readonly, redo, removeSelected, selectedId, undo]);

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (readonly || event.button !== 0) return;
    const point = pointAt(event.clientX, event.clientY); if (!point) return;
    const target = event.target as Element;
    const hitId = target.closest<SVGElement>("[data-annotation-id]")?.dataset.annotationId;
    const resizeId = target.closest<SVGElement>("[data-resize-id]")?.dataset.resizeId;
    if (resizeId) {
      const original = value.items.find((item) => item.id === resizeId);
      if (original?.type === "rect") {
        setGesture({ tool: "resize", start: point, points: [point], original });
        setPointer(point);
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      return;
    }
    if (textDraft) return;
    if (tool === "text") {
      setSelectedId(undefined);
      setTextDraft({ point, text: "", style: { color, strokeWidth } });
      return;
    }
    if (tool === "select") {
      setSelectedId(hitId);
      const original = value.items.find((item) => item.id === hitId);
      if (!original) return;
      if (original.type === "text" && event.detail >= 2) {
        setTextDraft({ id: original.id, point: original.point, text: original.text, style: original.style });
        return;
      }
      setGesture({ tool, start: point, points: [point], original });
    } else { setSelectedId(undefined); setGesture({ tool, start: point, points: [point] }); }
    setPointer(point); event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!gesture) return; const point = pointAt(event.clientX, event.clientY); if (!point) return; setPointer(point);
    if (gesture.tool === "path") setGesture({ ...gesture, points: [...gesture.points, point] });
  };
  const pointerUp = () => {
    if (!gesture || !pointer) { setGesture(undefined); return; }
    const style = { color, strokeWidth }; let next: Annotation | undefined;
    if (gesture.tool === "resize" && gesture.original?.type === "rect") {
      next = { ...gesture.original, width: Math.max(.005, pointer.x - gesture.original.x), height: Math.max(.005, pointer.y - gesture.original.y) };
      commit({ version: 2, items: value.items.map((item) => item.id === next?.id ? next : item) });
    } else if (gesture.tool === "select" && gesture.original) {
      next = moveAnnotation(gesture.original, pointer.x - gesture.start.x, pointer.y - gesture.start.y);
      if (Math.hypot(pointer.x - gesture.start.x, pointer.y - gesture.start.y) > .002) commit({ version: 2, items: value.items.map((item) => item.id === next?.id ? next : item) });
    } else if (gesture.tool === "rect") {
      const x = Math.min(gesture.start.x, pointer.x), y = Math.min(gesture.start.y, pointer.y), width = Math.abs(pointer.x - gesture.start.x), height = Math.abs(pointer.y - gesture.start.y);
      if (width * height > .00002) next = { id: createAnnotationId(), type: "rect", x, y, width, height, style };
    } else if (gesture.tool === "arrow" && Math.hypot(pointer.x - gesture.start.x, pointer.y - gesture.start.y) > .005) next = { id: createAnnotationId(), type: "arrow", start: gesture.start, end: pointer, style };
    else if (gesture.tool === "path") { const points = simplifyPath([...gesture.points, pointer]); if (points.length > 1) next = { id: createAnnotationId(), type: "path", points, style }; }
    if (next && !["select", "resize"].includes(gesture.tool)) {
      commit({ version: 2, items: [...value.items, next] });
      setSelectedId(next.id);
      setTool("select");
    }
    setGesture(undefined); setPointer(undefined);
  };
  const cancelGesture = () => { setGesture(undefined); setPointer(undefined); };
  const commitText = () => {
    const text = textDraft?.text.trim();
    if (textDraft && text) {
      const next: Annotation = { id: textDraft.id ?? createAnnotationId(), type: "text", point: textDraft.point, text, style: textDraft.style };
      commit({
        version: 2,
        items: textDraft.id
          ? value.items.map((item) => item.id === textDraft.id ? next : item)
          : [...value.items, next],
      });
      setSelectedId(next.id);
      setTool("select");
    }
    setTextDraft(undefined);
  };

  const render = (item: Annotation, preview = false) => {
    const className = `image-annotation ${selectedId === item.id ? "is-selected" : ""} ${preview ? "is-preview" : ""}`;
    const common = { "data-annotation-id": item.id, className, stroke: item.style.color, strokeWidth: item.style.strokeWidth };
    if (item.type === "rect") return <g key={item.id}><rect {...common} className={`${className} image-annotation--rect`} x={item.x * size.width} y={item.y * size.height} width={item.width * size.width} height={item.height * size.height} />{selectedId === item.id && !readonly && !preview ? <circle data-resize-id={item.id} className="annotation-resize-handle" cx={(item.x + item.width) * size.width} cy={(item.y + item.height) * size.height} r={7} /> : null}</g>;
    if (item.type === "arrow") return <g key={item.id}><line data-annotation-id={item.id} className={`annotation-hit-target${preview ? " is-preview" : ""}`} x1={item.start.x * size.width} y1={item.start.y * size.height} x2={item.end.x * size.width} y2={item.end.y * size.height} /><line {...common} className={`${className} image-annotation--line`} x1={item.start.x * size.width} y1={item.start.y * size.height} x2={item.end.x * size.width} y2={item.end.y * size.height} markerEnd="url(#annotation-arrow)" /></g>;
    if (item.type === "path") {
      const points = item.points.map((point) => `${point.x * size.width},${point.y * size.height}`).join(" ");
      return <g key={item.id}><polyline data-annotation-id={item.id} className={`annotation-hit-target${preview ? " is-preview" : ""}`} points={points} /><polyline {...common} className={`${className} image-annotation--line`} points={points} /></g>;
    }
    return <text key={item.id} {...common} x={item.point.x * size.width} y={item.point.y * size.height} fill={item.style.color} stroke="none" fontSize={Math.max(16, item.style.strokeWidth * 5)}>{item.text}</text>;
  };
  const displayedItems = gesture?.original && pointer
    ? value.items.map((item) => {
        if (item.id !== gesture.original?.id) return item;
        if (gesture.tool === "select") return moveAnnotation(gesture.original, pointer.x - gesture.start.x, pointer.y - gesture.start.y);
        if (gesture.tool === "resize" && gesture.original.type === "rect") {
          return {
            ...gesture.original,
            width: Math.max(.005, pointer.x - gesture.original.x),
            height: Math.max(.005, pointer.y - gesture.original.y),
          };
        }
        return item;
      })
    : value.items;
  let preview: Annotation | undefined;
  if (gesture && pointer && gesture.tool === "rect") preview = { id: "preview", type: "rect", x: Math.min(gesture.start.x, pointer.x), y: Math.min(gesture.start.y, pointer.y), width: Math.abs(pointer.x - gesture.start.x), height: Math.abs(pointer.y - gesture.start.y), style: { color, strokeWidth } };
  if (gesture && pointer && gesture.tool === "arrow") preview = { id: "preview", type: "arrow", start: gesture.start, end: pointer, style: { color, strokeWidth } };
  if (gesture?.tool === "path") preview = { id: "preview", type: "path", points: gesture.points, style: { color, strokeWidth } };

  return <div className={`annotation-editor ${readonly ? "annotation-editor--readonly" : ""}`}>
    {!readonly && <div className="annotation-toolbar" aria-label="画像注釈ツール">
      <ButtonGroup size="sm">{TOOLS.map(([key, label, Icon]) => <Button key={key} variant={tool === key ? "primary" : "outline-secondary"} title={label} aria-label={label} aria-pressed={tool === key} onClick={() => setTool(key)}><Icon size={15} /></Button>)}</ButtonGroup>
      <div className="annotation-colors">{COLORS.map((item) => <button key={item} type="button" className={color === item ? "is-active" : ""} style={{ backgroundColor: item }} aria-label={`色 ${item}`} aria-pressed={color === item} onClick={() => setColor(item)} />)}</div>
      <Form.Select size="sm" value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))} aria-label="線の太さ"><option value={2}>細</option><option value={4}>中</option><option value={7}>太</option></Form.Select>
      <ButtonGroup size="sm"><Button variant="outline-secondary" aria-label="元に戻す" onClick={undo}><Undo2Icon size={15} /></Button><Button variant="outline-secondary" aria-label="やり直す" onClick={redo}><Redo2Icon size={15} /></Button><Button variant="outline-danger" aria-label="選択を削除" onClick={removeSelected} disabled={!selectedId}><Trash2Icon size={15} /></Button></ButtonGroup>
      <ButtonGroup size="sm"><Button variant="outline-secondary" aria-label="縮小" onClick={() => setZoom((n) => Math.max(50, n - 25))}><ZoomOutIcon size={15} /></Button><Button variant="outline-secondary" aria-label="ズームを100%に戻す" onClick={() => setZoom(100)}>{zoom}%</Button><Button variant="outline-secondary" aria-label="拡大" onClick={() => setZoom((n) => Math.min(300, n + 25))}><ZoomInIcon size={15} /></Button></ButtonGroup>
    </div>}
    <div className="annotation-viewport"><div ref={stageRef} className={`annotation-stage tool-${tool}${gesture?.tool === "select" ? " is-dragging" : ""}`} style={{ width: `${zoom}%` }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={cancelGesture}>
      <img src={src} alt="注釈対象" draggable={false} onLoad={(event) => setSize({ width: event.currentTarget.naturalWidth || 1, height: event.currentTarget.naturalHeight || 1 })} />
      <svg viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="xMidYMid meet"><defs><marker id="annotation-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="context-stroke" /></marker></defs>{displayedItems.map((item) => render(item))}{preview ? render(preview, true) : null}</svg>
      {textDraft && <Form.Control autoFocus className="annotation-text-input" style={{ left: `${textDraft.point.x * 100}%`, top: `${textDraft.point.y * 100}%`, transform: `translate(${textDraft.point.x > .7 ? "-100%" : "0"}, -50%)` }} value={textDraft.text} maxLength={500} aria-label={textDraft.id ? "注釈文字を編集" : "注釈文字を追加"} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} onChange={(event) => setTextDraft({ ...textDraft, text: event.target.value })} onBlur={commitText} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); commitText(); } if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setTextDraft(undefined); } }} placeholder="文字を入力" />}
    </div></div>
    {!readonly && <div className="annotation-hint">ドラッグで移動、文字はダブルクリックで編集、Deleteで削除、Ctrl/Cmd+Zで元に戻せます</div>}
  </div>;
}
