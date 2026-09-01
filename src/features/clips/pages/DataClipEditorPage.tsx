import { useEffect, useRef, useState } from "react";
import { Alert, Button, ButtonGroup, Container, Form, Spinner } from "react-bootstrap";
import { ArrowLeft, BarChart3, Copy, Plus, Redo2, Repeat2, Save, Star, Trash2, Undo2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useBlocker, useNavigate, useRouter } from "@tanstack/react-router";
import { createDataClip, getClip, updateDataClip } from "../api";
import { parseDelimitedText } from "../data/csv";
import {
  DATA_CLIP_MAX_CELLS, cloneDocument, columnLetter, createDataDocument, createDataView, createUniqueColumnId,
  inferColumnType, normalizeDataDocument, normalizeSelection, selectedColumns, transposeDataDocument,
  validateAllVisualizations, type DataClipDocument, type DataClipView, type DataColumnType, type DataSelection, type DataViewType,
} from "../data/dataClipModel";
import { DataChart } from "../data/DataChart";
import { DataTableEditor } from "../data/DataTableEditor";
import "../data/dataClip.css";

type Props = { clipId?: string; returnTo: string };

function adjustAxisForInsert(selection: DataSelection, axis: "row" | "column", index: number, oldCount: number) {
  const startKey = axis === "row" ? "rowStart" : "columnStart";
  const endKey = axis === "row" ? "rowEnd" : "columnEnd";
  const start = selection[startKey];
  const end = selection[endKey];
  if (index <= start) { selection[startKey]++; selection[endKey]++; }
  else if (index <= end || (index === oldCount && end === oldCount - 1)) selection[endKey]++;
}

function createColumnName(document: DataClipDocument, index: number) {
  const base = columnLetter(index);
  const names = new Set(document.columns.map((column) => column.name));
  if (!names.has(base)) return base;
  let suffix = 2;
  while (names.has(`${base} ${suffix}`)) suffix++;
  return `${base} ${suffix}`;
}

function adjustAxisForDelete(selection: DataSelection, axis: "row" | "column", start: number, count: number, nextCount: number) {
  const startKey = axis === "row" ? "rowStart" : "columnStart";
  const endKey = axis === "row" ? "rowEnd" : "columnEnd";
  const deletedEnd = start + count - 1;
  const selectedStart = selection[startKey];
  const selectedEnd = selection[endKey];
  if (selectedStart > deletedEnd) {
    selection[startKey] -= count;
    selection[endKey] -= count;
  } else if (selectedEnd >= start) {
    selection[startKey] = selectedStart < start ? selectedStart : start;
    selection[endKey] = selectedEnd > deletedEnd ? selectedEnd - count : Math.max(0, start - 1);
  }
  const normalized = axis === "row"
    ? normalizeSelection(selection, nextCount, Number.MAX_SAFE_INTEGER)
    : normalizeSelection(selection, Number.MAX_SAFE_INTEGER, nextCount);
  Object.assign(selection, normalized);
}

export function DataClipEditorPage({ clipId, returnTo }: Props) {
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rawText, setRawText] = useState("");
  const [firstRowIsHeader, setFirstRowIsHeader] = useState(true);
  const [name, setName] = useState("データCLIP");
  const [document, setDocument] = useState<DataClipDocument | null>(null);
  const [activeViewId, setActiveViewId] = useState("");
  const [undoStack, setUndoStack] = useState<DataClipDocument[]>([]);
  const [redoStack, setRedoStack] = useState<DataClipDocument[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(clipId));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const anchorRef = useRef<{ row: number; column: number } | null>(null);
  const allowNavigationRef = useRef(false);

  useBlocker({ disabled: !isDirty, enableBeforeUnload: isDirty, shouldBlockFn: () => allowNavigationRef.current ? false : !window.confirm("未保存の変更を破棄しますか？") });
  useEffect(() => {
    if (!clipId) return;
    let cancelled = false;
    getClip(clipId).then((clip) => {
      if (cancelled) return;
      if (clip.kind !== "data") throw new Error("データCLIPではありません。");
      const normalized = normalizeDataDocument(clip.data);
      if (!normalized) throw new Error("データCLIPの保存形式が不正です。");
      setName(clip.name); setDocument(normalized); setActiveViewId(normalized.defaultViewId);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "データCLIPを読み込めませんでした。"))
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [clipId]);

  const activeView = document?.views.find((view) => view.id === activeViewId) ?? document?.views[0];
  function goBack() {
    if (isDirty && !window.confirm("未保存の変更を破棄しますか？")) return;
    allowNavigationRef.current = true; router.history.push(returnTo);
  }
  function importData() {
    try {
      const next = createDataDocument(parseDelimitedText(rawText), firstRowIsHeader);
      setDocument(next); setActiveViewId(next.defaultViewId); setUndoStack([]); setRedoStack([]); setIsDirty(true); setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "データを解析できませんでした。"); }
  }
  function commit(next: DataClipDocument) {
    if (!document) return;
    setUndoStack((stack) => [...stack.slice(-49), cloneDocument(document)]); setRedoStack([]); setDocument(next); setIsDirty(true); setError("");
  }
  function updateView(update: (view: DataClipView, next: DataClipDocument) => void) {
    if (!document || !activeView) return;
    const next = cloneDocument(document); const view = next.views.find((item) => item.id === activeView.id);
    if (!view) return; update(view, next); setDocument(next); setIsDirty(true);
  }
  function undo() {
    const previous = undoStack.at(-1); if (!previous || !document) return;
    setUndoStack((stack) => stack.slice(0, -1)); setRedoStack((stack) => [...stack, cloneDocument(document)]); setDocument(previous);
    if (!previous.views.some((view) => view.id === activeViewId)) setActiveViewId(previous.defaultViewId); setIsDirty(true);
  }
  function redo() {
    const next = redoStack.at(-1); if (!next || !document) return;
    setRedoStack((stack) => stack.slice(0, -1)); setUndoStack((stack) => [...stack, cloneDocument(document)]); setDocument(next);
    if (!next.views.some((view) => view.id === activeViewId)) setActiveViewId(next.defaultViewId); setIsDirty(true);
  }

  function insertRow(after: boolean) {
    if (!document || !activeView) return;
    const next = cloneDocument(document); const index = after ? activeView.selection.rowEnd + 1 : activeView.selection.rowStart;
    next.views.forEach((view) => adjustAxisForInsert(view.selection, "row", index, next.rows.length));
    next.rows.splice(index, 0, Array(next.columns.length).fill("")); commit(next);
  }
  function insertColumn(after: boolean) {
    if (!document || !activeView) return;
    const next = cloneDocument(document); const index = after ? activeView.selection.columnEnd + 1 : activeView.selection.columnStart;
    next.views.forEach((view) => adjustAxisForInsert(view.selection, "column", index, next.columns.length));
    next.columns.splice(index, 0, { id: createUniqueColumnId(), name: createColumnName(next, index), type: "string" });
    next.rows.forEach((row) => row.splice(index, 0, "")); commit(next);
  }
  function deleteRows() {
    if (!document || !activeView) return;
    const count = activeView.selection.rowEnd - activeView.selection.rowStart + 1;
    if (count >= document.rows.length) return;
    const next = cloneDocument(document); next.rows.splice(activeView.selection.rowStart, count);
    next.views.forEach((view) => adjustAxisForDelete(view.selection, "row", activeView.selection.rowStart, count, next.rows.length)); commit(next);
  }
  function deleteColumns() {
    if (!document || !activeView) return;
    const count = activeView.selection.columnEnd - activeView.selection.columnStart + 1;
    if (count >= document.columns.length) return;
    const next = cloneDocument(document);
    const removedIds = new Set(next.columns.slice(activeView.selection.columnStart, activeView.selection.columnEnd + 1).map((column) => column.id));
    next.columns.splice(activeView.selection.columnStart, count); next.rows.forEach((row) => row.splice(activeView.selection.columnStart, count));
    next.views.forEach((view) => {
      adjustAxisForDelete(view.selection, "column", activeView.selection.columnStart, count, next.columns.length);
      view.visualization.yColumnIds = view.visualization.yColumnIds.filter((id) => !removedIds.has(id));
      if (view.visualization.xColumnId && removedIds.has(view.visualization.xColumnId)) view.visualization.xColumnId = next.columns[view.selection.columnStart]?.id;
    });
    commit(next);
  }
  function pasteCells(startRow: number, startColumn: number, text: string) {
    if (!document || !activeView) return;
    try {
      const pasted = parseDelimitedText(text); const width = Math.max(...pasted.map((row) => row.length));
      const requiredRows = startRow + pasted.length; const requiredColumns = startColumn + width;
      if (requiredRows * requiredColumns > DATA_CLIP_MAX_CELLS) throw new Error("データは2万セル以下にしてください。");
      const next = cloneDocument(document); const oldRows = next.rows.length; const oldColumns = next.columns.length;
      while (next.rows.length < requiredRows) next.rows.push(Array(next.columns.length).fill(""));
      while (next.columns.length < requiredColumns) {
        const index = next.columns.length;
        next.columns.push({ id: createUniqueColumnId(), name: createColumnName(next, index), type: "string" }); next.rows.forEach((row) => row.push(""));
      }
      if (next.rows.length > oldRows) next.views.forEach((view) => { if (view.selection.rowEnd === oldRows - 1) view.selection.rowEnd = next.rows.length - 1; });
      if (next.columns.length > oldColumns) next.views.forEach((view) => { if (view.selection.columnEnd === oldColumns - 1) view.selection.columnEnd = next.columns.length - 1; });
      pasted.forEach((row, rowOffset) => row.forEach((value, columnOffset) => { next.rows[startRow + rowOffset][startColumn + columnOffset] = value; }));
      for (let column = oldColumns; column < next.columns.length; column++) next.columns[column].type = inferColumnType(next.rows.map((row) => row[column]));
      const nextView = next.views.find((view) => view.id === activeView.id)!;
      nextView.selection = normalizeSelection({ rowStart: startRow, rowEnd: requiredRows - 1, columnStart: startColumn, columnEnd: requiredColumns - 1 }, next.rows.length, next.columns.length);
      commit(next);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "貼り付けられませんでした。"); }
  }

  function addView(duplicate: boolean) {
    if (!document || !activeView) return;
    const next = cloneDocument(document);
    const view = duplicate ? { ...structuredClone(activeView), id: crypto.randomUUID(), name: `${activeView.name}（コピー）` } : createDataView(next.columns, next.rows.length, `ビュー${next.views.length + 1}`);
    next.views.push(view); commit(next); setActiveViewId(view.id);
  }
  function deleteView() {
    if (!document || !activeView || document.views.length === 1 || !window.confirm(`「${activeView.name}」を削除しますか？`)) return;
    const next = cloneDocument(document); next.views = next.views.filter((view) => view.id !== activeView.id);
    if (next.defaultViewId === activeView.id) next.defaultViewId = next.views[0].id;
    commit(next); setActiveViewId(next.defaultViewId);
  }
  async function save() {
    if (!document || !name.trim()) return;
    const validationError = validateAllVisualizations(document); if (validationError) { setError(validationError); return; }
    setIsSaving(true); setError("");
    try {
      const savedClip = clipId
        ? await updateDataClip(clipId, name.trim(), document)
        : await createDataClip(name.trim(), document);
      await queryClient.invalidateQueries({ queryKey: ["clips"] });
      setIsDirty(false);
      setSavedMessage("保存しました。");
      if (!clipId) {
        allowNavigationRef.current = true;
        await navigate({
          to: "/clips/data/$clipid",
          params: { clipid: savedClip.id },
          search: { returnTo },
          replace: true,
        });
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "データCLIPを保存できませんでした。もう一度お試しください。"); }
    finally { setIsSaving(false); }
  }

  if (isLoading) return <Container className="data-editor-page"><div className="text-center py-5"><Spinner /></div></Container>;
  const selected = document && activeView ? selectedColumns(document, activeView) : [];
  const numeric = selected.filter((column) => column.type === "number");
  return <Container fluid className="data-editor-page">
    <header className="data-editor-header"><Button variant="light" aria-label="戻る" onClick={goBack}><ArrowLeft size={18} /></Button><div><h1>{clipId ? "データCLIPを編集" : "データCLIPを作成"}</h1><p>1つの表から複数のビューを作成できます。</p></div>{document && <Button variant="primary" onClick={() => void save()} disabled={isSaving || !name.trim()}><Save size={16} /> {isSaving ? "保存中…" : "保存"}</Button>}</header>
    {error && <Alert variant="danger">{error}</Alert>}
    {savedMessage && !isDirty && <Alert variant="success">{savedMessage}</Alert>}
    {!document ? <section className="data-import-panel"><Form.Group><Form.Label>CSVまたはExcelのセルを貼り付け</Form.Label><Form.Control as="textarea" rows={14} value={rawText} onChange={(event) => setRawText(event.target.value)} autoFocus /></Form.Group><div className="d-flex justify-content-between align-items-center mt-3"><Form.Check label="先頭行を列名として使う" checked={firstRowIsHeader} onChange={(event) => setFirstRowIsHeader(event.target.checked)} /><Button onClick={importData} disabled={!rawText.trim()}>データを読み込む</Button></div></section> : activeView && <>
      <div className="data-editor-title-row"><Form.Control value={name} onChange={(event) => { setName(event.target.value); setIsDirty(true); }} aria-label="CLIPタイトル" /><ButtonGroup><Button variant="outline-secondary" onClick={undo} disabled={!undoStack.length}><Undo2 size={16} /></Button><Button variant="outline-secondary" onClick={redo} disabled={!redoStack.length}><Redo2 size={16} /></Button></ButtonGroup><Button variant="outline-secondary" onClick={() => commit(transposeDataDocument(document))}><Repeat2 size={15} /> 行列を転置</Button></div>
      <div className="data-structure-actions"><ButtonGroup size="sm"><Button variant="outline-secondary" onClick={() => insertRow(false)}><Plus size={14} /> 行を前に</Button><Button variant="outline-secondary" onClick={() => insertRow(true)}><Plus size={14} /> 行を後に</Button><Button variant="outline-danger" onClick={deleteRows} disabled={document.rows.length <= activeView.selection.rowEnd - activeView.selection.rowStart + 1}><Trash2 size={14} /> 選択行</Button></ButtonGroup><ButtonGroup size="sm"><Button variant="outline-secondary" onClick={() => insertColumn(false)}><Plus size={14} /> 列を左に</Button><Button variant="outline-secondary" onClick={() => insertColumn(true)}><Plus size={14} /> 列を右に</Button><Button variant="outline-danger" onClick={deleteColumns} disabled={document.columns.length <= activeView.selection.columnEnd - activeView.selection.columnStart + 1}><Trash2 size={14} /> 選択列</Button></ButtonGroup><small>セルを選択してCSV/TSVを貼り付けできます</small></div>
      <div className="data-editor-layout"><section className="data-editor-grid-panel"><DataTableEditor document={document} selection={activeView.selection} onPasteCells={pasteCells}
        onSelectionChange={(row, column, extend) => updateView((view, next) => { if (!extend || !anchorRef.current) anchorRef.current = { row, column }; const anchor = anchorRef.current ?? { row, column }; view.selection = normalizeSelection({ rowStart: anchor.row, rowEnd: row, columnStart: anchor.column, columnEnd: column }, next.rows.length, next.columns.length); })}
        onCellChange={(row, column, value) => { const next = cloneDocument(document); next.rows[row][column] = value; commit(next); }}
        onColumnChange={(column, patch: { name?: string; type?: DataColumnType }) => { const next = cloneDocument(document); Object.assign(next.columns[column], patch); commit(next); }} /></section>
        <aside className="data-editor-preview-panel"><div className="data-view-toolbar"><Form.Select size="sm" value={activeView.id} onChange={(event) => { setActiveViewId(event.target.value); anchorRef.current = null; }}>{document.views.map((view) => <option key={view.id} value={view.id}>{view.name}{view.id === document.defaultViewId ? " ★" : ""}</option>)}</Form.Select><Button size="sm" variant="outline-secondary" onClick={() => addView(false)} title="ビューを追加"><Plus size={15} /></Button><Button size="sm" variant="outline-secondary" onClick={() => addView(true)} title="ビューを複製"><Copy size={15} /></Button><Button size="sm" variant={activeView.id === document.defaultViewId ? "warning" : "outline-secondary"} onClick={() => updateView((_view, next) => { next.defaultViewId = activeView.id; })} title="代表ビュー"><Star size={15} /></Button><Button size="sm" variant="outline-danger" onClick={deleteView} disabled={document.views.length === 1}><Trash2 size={15} /></Button></div>
        <div className="data-view-controls"><Form.Label>ビュー名</Form.Label><Form.Control size="sm" value={activeView.name} onChange={(event) => updateView((view) => { view.name = event.target.value; })} /><Form.Label>表示方法</Form.Label><Form.Select value={activeView.visualization.type} onChange={(event) => updateView((view) => { view.visualization.type = event.target.value as DataViewType; })}><option value="table">表</option><option value="line">折れ線</option><option value="bar">棒</option><option value="scatter">散布図</option><option value="kpi">KPI</option></Form.Select><Form.Label>タイトル</Form.Label><Form.Control value={activeView.visualization.title} onChange={(event) => updateView((view) => { view.visualization.title = event.target.value; })} />
        {activeView.visualization.type !== "table" && activeView.visualization.type !== "kpi" && <><Form.Label>X軸</Form.Label><Form.Select value={activeView.visualization.xColumnId ?? ""} onChange={(event) => updateView((view) => { view.visualization.xColumnId = event.target.value; })}>{selected.map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}</Form.Select></>}
        {activeView.visualization.type !== "table" && <><Form.Label>{activeView.visualization.type === "kpi" ? "値" : "Y軸"}</Form.Label><Form.Select multiple={activeView.visualization.type === "line" || activeView.visualization.type === "bar"} value={activeView.visualization.type === "line" || activeView.visualization.type === "bar" ? activeView.visualization.yColumnIds : (activeView.visualization.yColumnIds[0] ?? "")} onChange={(event) => updateView((view) => { view.visualization.yColumnIds = Array.from(event.target.selectedOptions, (option) => option.value); })}>{numeric.map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}</Form.Select><Form.Label>単位</Form.Label><Form.Control value={activeView.visualization.unit} onChange={(event) => updateView((view) => { view.visualization.unit = event.target.value; })} /></>}
        {activeView.visualization.type === "kpi" && <><Form.Label>集計</Form.Label><Form.Select value={activeView.visualization.kpiAggregation} onChange={(event) => updateView((view) => { view.visualization.kpiAggregation = event.target.value as typeof view.visualization.kpiAggregation; })}><option value="latest">最新値</option><option value="sum">合計</option><option value="average">平均</option><option value="min">最小</option><option value="max">最大</option><option value="count">件数</option></Form.Select></>}
        </div><div className="data-editor-chart"><div className="data-editor-chart-title"><BarChart3 size={16} /> プレビュー</div><DataChart document={document} view={activeView} /></div></aside></div>
    </>}
  </Container>;
}
