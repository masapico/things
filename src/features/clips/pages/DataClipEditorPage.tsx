import { useEffect, useRef, useState } from "react";
import { Alert, Button, ButtonGroup, Container, Form, Modal, Spinner } from "react-bootstrap";
import { ArrowLeft, BarChart3, ClipboardPaste, Copy, Plus, Redo2, Repeat2, Save, Star, Trash2, Undo2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useBlocker, useNavigate, useRouter } from "@tanstack/react-router";
import { createDataClip, getClip, updateDataClip } from "../api";
import { parseDelimitedText } from "../data/csv";
import {
  cloneDocument, columnLetter, createDataDocument, createDataView, createUniqueColumnId,
  inferColumnType, normalizeDataDocument, normalizeSelection, selectedColumns, transposeDataDocument,
  validateAllVisualizations, type DataClipDocument, type DataClipView, type DataColumnType, type DataSelection, type DataViewType,
} from "../data/dataClipModel";
import { DataChart } from "../data/DataChart";
import { DataTableEditor } from "../data/DataTableEditor";
import {
  gridSelectionForView, normalizeGridSelection, pasteOverSelection,
  viewSelectionFromGrid, type GridSelection, type GridSelectionMode,
} from "../data/dataClipOperations";
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
  const [gridSelection, setGridSelection] = useState<GridSelection>({ mode: "cells", rowStart: 0, rowEnd: 0, columnStart: 0, columnEnd: 0 });
  const [undoStack, setUndoStack] = useState<DataClipDocument[]>([]);
  const [redoStack, setRedoStack] = useState<DataClipDocument[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(clipId));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [pasteTarget, setPasteTarget] = useState<{ mode: "rows" | "columns"; selection: GridSelection } | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState("");
  const anchorRef = useRef<{ mode: GridSelectionMode; row: number; column: number } | null>(null);
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
      const defaultView = normalized.views.find((view) => view.id === normalized.defaultViewId) ?? normalized.views[0];
      setName(clip.name); setDocument(normalized); setActiveViewId(defaultView.id); setGridSelection(gridSelectionForView(defaultView.selection));
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
      setDocument(next); setActiveViewId(next.defaultViewId); setGridSelection(gridSelectionForView(next.views[0].selection)); setUndoStack([]); setRedoStack([]); setIsDirty(true); setError("");
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
    const view = previous.views.find((item) => item.id === activeViewId) ?? previous.views.find((item) => item.id === previous.defaultViewId) ?? previous.views[0];
    if (view.id !== activeViewId) setActiveViewId(view.id); setGridSelection(gridSelectionForView(view.selection)); setIsDirty(true);
  }
  function redo() {
    const next = redoStack.at(-1); if (!next || !document) return;
    setRedoStack((stack) => stack.slice(0, -1)); setUndoStack((stack) => [...stack, cloneDocument(document)]); setDocument(next);
    const view = next.views.find((item) => item.id === activeViewId) ?? next.views.find((item) => item.id === next.defaultViewId) ?? next.views[0];
    if (view.id !== activeViewId) setActiveViewId(view.id); setGridSelection(gridSelectionForView(view.selection)); setIsDirty(true);
  }
  function selectGrid(mode: GridSelectionMode, row: number, column: number, extend: boolean) {
    if (!document) return;
    if (!extend || !anchorRef.current || anchorRef.current.mode !== mode) anchorRef.current = { mode, row, column };
    const anchor = anchorRef.current;
    const candidate: GridSelection = {
      mode,
      rowStart: mode === "columns" ? 0 : anchor.row,
      rowEnd: mode === "columns" ? document.rows.length - 1 : row,
      columnStart: mode === "rows" ? 0 : anchor.column,
      columnEnd: mode === "rows" ? document.columns.length - 1 : column,
    };
    setGridSelection(normalizeGridSelection(candidate, document));
  }
  function transpose() {
    if (!document) return;
    const next = transposeDataDocument(document);
    const view = next.views.find((item) => item.id === next.defaultViewId) ?? next.views[0];
    commit(next); setActiveViewId(view.id); setGridSelection(gridSelectionForView(view.selection)); anchorRef.current = null;
  }

  function insertRow(after: boolean) {
    if (!document || !activeView) return;
    const next = cloneDocument(document); const index = after ? gridSelection.rowEnd + 1 : gridSelection.rowStart;
    next.views.forEach((view) => adjustAxisForInsert(view.selection, "row", index, next.rows.length));
    next.rows.splice(index, 0, Array(next.columns.length).fill("")); commit(next);
    setGridSelection({ mode: "rows", rowStart: index, rowEnd: index, columnStart: 0, columnEnd: next.columns.length - 1 });
  }
  function insertColumn(after: boolean) {
    if (!document || !activeView) return;
    const next = cloneDocument(document); const index = after ? gridSelection.columnEnd + 1 : gridSelection.columnStart;
    next.views.forEach((view) => adjustAxisForInsert(view.selection, "column", index, next.columns.length));
    next.columns.splice(index, 0, { id: createUniqueColumnId(), name: createColumnName(next, index), type: "string" });
    next.rows.forEach((row) => row.splice(index, 0, "")); commit(next);
    setGridSelection({ mode: "columns", rowStart: 0, rowEnd: next.rows.length - 1, columnStart: index, columnEnd: index });
  }
  function deleteRows() {
    if (!document || !activeView) return;
    const count = gridSelection.rowEnd - gridSelection.rowStart + 1;
    if (count >= document.rows.length) return;
    const next = cloneDocument(document); next.rows.splice(gridSelection.rowStart, count);
    next.views.forEach((view) => adjustAxisForDelete(view.selection, "row", gridSelection.rowStart, count, next.rows.length)); commit(next);
    setGridSelection(normalizeGridSelection({ ...gridSelection, rowEnd: gridSelection.rowStart, columnStart: 0, columnEnd: next.columns.length - 1 }, next));
  }
  function deleteColumns() {
    if (!document || !activeView) return;
    const count = gridSelection.columnEnd - gridSelection.columnStart + 1;
    if (count >= document.columns.length) return;
    const next = cloneDocument(document);
    const removedIds = new Set(next.columns.slice(gridSelection.columnStart, gridSelection.columnEnd + 1).map((column) => column.id));
    next.columns.splice(gridSelection.columnStart, count); next.rows.forEach((row) => row.splice(gridSelection.columnStart, count));
    next.views.forEach((view) => {
      adjustAxisForDelete(view.selection, "column", gridSelection.columnStart, count, next.columns.length);
      view.visualization.yColumnIds = view.visualization.yColumnIds.filter((id) => !removedIds.has(id));
      if (view.visualization.xColumnId && removedIds.has(view.visualization.xColumnId)) view.visualization.xColumnId = next.columns[view.selection.columnStart]?.id;
    });
    commit(next);
    setGridSelection(normalizeGridSelection({ ...gridSelection, columnEnd: gridSelection.columnStart, rowStart: 0, rowEnd: next.rows.length - 1 }, next));
  }
  function openPasteDialog(mode: "rows" | "columns") {
    if (gridSelection.mode !== mode) return;
    setPasteTarget({ mode, selection: { ...gridSelection } });
    setPasteText(""); setPasteError("");
  }
  function closePasteDialog() {
    setPasteTarget(null); setPasteText(""); setPasteError("");
  }
  function applyPaste() {
    if (!document || !pasteTarget) return;
    try {
      const next = pasteOverSelection(document, pasteTarget.selection, pasteText);
      commit(next); setGridSelection(pasteTarget.selection); closePasteDialog();
    } catch (reason) { setPasteError(reason instanceof Error ? reason.message : "貼り付けられませんでした。"); }
  }

  function addView(duplicate: boolean) {
    if (!document || !activeView) return;
    const next = cloneDocument(document);
    const view = duplicate ? { ...structuredClone(activeView), id: crypto.randomUUID(), name: `${activeView.name}（コピー）` } : createDataView(next.columns, next.rows.length, `ビュー${next.views.length + 1}`);
    next.views.push(view); commit(next); setActiveViewId(view.id); setGridSelection(gridSelectionForView(view.selection));
  }
  function deleteView() {
    if (!document || !activeView || document.views.length === 1 || !window.confirm(`「${activeView.name}」を削除しますか？`)) return;
    const next = cloneDocument(document); next.views = next.views.filter((view) => view.id !== activeView.id);
    if (next.defaultViewId === activeView.id) next.defaultViewId = next.views[0].id;
    commit(next); setActiveViewId(next.defaultViewId); setGridSelection(gridSelectionForView(next.views[0].selection));
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
      <div className="data-editor-title-row"><Form.Control value={name} onChange={(event) => { setName(event.target.value); setIsDirty(true); }} aria-label="CLIPタイトル" /><ButtonGroup><Button variant="outline-secondary" onClick={undo} disabled={!undoStack.length}><Undo2 size={16} /></Button><Button variant="outline-secondary" onClick={redo} disabled={!redoStack.length}><Redo2 size={16} /></Button></ButtonGroup><Button variant="outline-secondary" onClick={transpose}><Repeat2 size={15} /> 行列を転置</Button></div>
      <div className="data-structure-actions"><ButtonGroup size="sm"><Button variant="outline-secondary" onClick={() => insertRow(false)}><Plus size={14} /> 行を前に</Button><Button variant="outline-secondary" onClick={() => insertRow(true)}><Plus size={14} /> 行を後に</Button><Button variant="outline-primary" onClick={() => openPasteDialog("rows")} disabled={gridSelection.mode !== "rows"}><ClipboardPaste size={14} /> 行を貼り付け</Button><Button variant="outline-danger" onClick={deleteRows} disabled={document.rows.length <= gridSelection.rowEnd - gridSelection.rowStart + 1}><Trash2 size={14} /> 選択行</Button></ButtonGroup><ButtonGroup size="sm"><Button variant="outline-secondary" onClick={() => insertColumn(false)}><Plus size={14} /> 列を左に</Button><Button variant="outline-secondary" onClick={() => insertColumn(true)}><Plus size={14} /> 列を右に</Button><Button variant="outline-primary" onClick={() => openPasteDialog("columns")} disabled={gridSelection.mode !== "columns"}><ClipboardPaste size={14} /> 列を貼り付け</Button><Button variant="outline-danger" onClick={deleteColumns} disabled={document.columns.length <= gridSelection.columnEnd - gridSelection.columnStart + 1}><Trash2 size={14} /> 選択列</Button></ButtonGroup><Button size="sm" variant="outline-primary" onClick={() => updateView((view) => { view.selection = viewSelectionFromGrid(gridSelection, document); })}>選択範囲をビューに反映</Button><small>行番号または列記号を選択すると、追加済みの範囲へデータを貼り付けられます。</small></div>
      <div className="data-editor-layout"><section className="data-editor-grid-panel"><DataTableEditor document={document} selection={gridSelection} viewSelection={activeView.selection}
        onSelectionChange={selectGrid}
        onCellChange={(row, column, value) => { const next = cloneDocument(document); const wasEmptyStringColumn = next.columns[column].type === "string" && next.rows.every((item) => !(item[column] ?? "").trim()); next.rows[row][column] = value; if (wasEmptyStringColumn) next.columns[column].type = inferColumnType(next.rows.map((item) => item[column])); commit(next); }}
        onColumnChange={(column, patch: { name?: string; type?: DataColumnType }) => { const next = cloneDocument(document); Object.assign(next.columns[column], patch); commit(next); }} /></section>
        <aside className="data-editor-preview-panel"><div className="data-view-toolbar"><Form.Select size="sm" value={activeView.id} onChange={(event) => { const view = document.views.find((item) => item.id === event.target.value); setActiveViewId(event.target.value); if (view) setGridSelection(gridSelectionForView(view.selection)); anchorRef.current = null; }}>{document.views.map((view) => <option key={view.id} value={view.id}>{view.name}{view.id === document.defaultViewId ? " ★" : ""}</option>)}</Form.Select><Button size="sm" variant="outline-secondary" onClick={() => addView(false)} title="ビューを追加"><Plus size={15} /></Button><Button size="sm" variant="outline-secondary" onClick={() => addView(true)} title="ビューを複製"><Copy size={15} /></Button><Button size="sm" variant={activeView.id === document.defaultViewId ? "warning" : "outline-secondary"} onClick={() => updateView((_view, next) => { next.defaultViewId = activeView.id; })} title="代表ビュー"><Star size={15} /></Button><Button size="sm" variant="outline-danger" onClick={deleteView} disabled={document.views.length === 1}><Trash2 size={15} /></Button></div>
        <div className="data-view-controls"><Form.Label>ビュー名</Form.Label><Form.Control size="sm" value={activeView.name} onChange={(event) => updateView((view) => { view.name = event.target.value; })} /><Form.Label>表示方法</Form.Label><Form.Select value={activeView.visualization.type} onChange={(event) => updateView((view) => { view.visualization.type = event.target.value as DataViewType; })}><option value="table">表</option><option value="line">折れ線</option><option value="bar">棒</option><option value="scatter">散布図</option><option value="kpi">KPI</option></Form.Select><Form.Label>タイトル</Form.Label><Form.Control value={activeView.visualization.title} onChange={(event) => updateView((view) => { view.visualization.title = event.target.value; })} />
        {activeView.visualization.type !== "table" && activeView.visualization.type !== "kpi" && <><Form.Label>X軸</Form.Label><Form.Select value={activeView.visualization.xColumnId ?? ""} onChange={(event) => updateView((view) => { view.visualization.xColumnId = event.target.value; })}>{selected.map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}</Form.Select></>}
        {activeView.visualization.type !== "table" && <><Form.Label>{activeView.visualization.type === "kpi" ? "値" : "Y軸"}</Form.Label><Form.Select multiple={activeView.visualization.type === "line" || activeView.visualization.type === "bar"} value={activeView.visualization.type === "line" || activeView.visualization.type === "bar" ? activeView.visualization.yColumnIds : (activeView.visualization.yColumnIds[0] ?? "")} onChange={(event) => updateView((view) => { view.visualization.yColumnIds = Array.from(event.target.selectedOptions, (option) => option.value); })}>{numeric.map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}</Form.Select><Form.Label>単位</Form.Label><Form.Control value={activeView.visualization.unit} onChange={(event) => updateView((view) => { view.visualization.unit = event.target.value; })} /></>}
        {activeView.visualization.type === "kpi" && <><Form.Label>集計</Form.Label><Form.Select value={activeView.visualization.kpiAggregation} onChange={(event) => updateView((view) => { view.visualization.kpiAggregation = event.target.value as typeof view.visualization.kpiAggregation; })}><option value="latest">最新値</option><option value="sum">合計</option><option value="average">平均</option><option value="min">最小</option><option value="max">最大</option><option value="count">件数</option></Form.Select></>}
        </div><div className="data-editor-chart"><div className="data-editor-chart-title"><BarChart3 size={16} /> プレビュー</div><DataChart document={document} view={activeView} /></div></aside></div>
      <Modal show={Boolean(pasteTarget)} onHide={closePasteDialog} centered className="data-paste-modal">
        <Modal.Header closeButton><Modal.Title>{pasteTarget?.mode === "rows" ? "行を貼り付け" : "列を貼り付け"}</Modal.Title></Modal.Header>
        <Modal.Body>
          <p className="data-paste-summary">選択範囲：{pasteTarget ? `${pasteTarget.selection.rowEnd - pasteTarget.selection.rowStart + 1}行 × ${pasteTarget.selection.columnEnd - pasteTarget.selection.columnStart + 1}列` : ""}</p>
          <Form.Group><Form.Label>ExcelまたはCSVのデータを貼り付け</Form.Label><Form.Control as="textarea" rows={10} value={pasteText} onChange={(event) => { setPasteText(event.target.value); setPasteError(""); }} autoFocus className="data-paste-textarea" /></Form.Group>
          {pasteTarget?.mode === "columns" && <Form.Text>先頭行を含むすべての内容をデータとして反映します。列名は変更しません。</Form.Text>}
          {pasteError && <Alert variant="danger" className="mt-3 mb-0">{pasteError}</Alert>}
        </Modal.Body>
        <Modal.Footer><Button variant="outline-secondary" onClick={closePasteDialog}>キャンセル</Button><Button onClick={applyPaste} disabled={!pasteText}><ClipboardPaste size={15} /> 反映</Button></Modal.Footer>
      </Modal>
    </>}
  </Container>;
}
