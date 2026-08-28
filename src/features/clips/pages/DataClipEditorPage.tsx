import { useEffect, useRef, useState } from "react";
import { Alert, Button, ButtonGroup, Container, Form, Spinner } from "react-bootstrap";
import { ArrowLeft, BarChart3, Redo2, Repeat2, Save, Trash2, Undo2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useBlocker, useRouter } from "@tanstack/react-router";
import { createDataClip, getClip, updateDataClip } from "../api";
import { parseDelimitedText } from "../data/csv";
import { cloneDocument, createDataDocument, normalizeSelection, selectedColumns, transposeDataDocument, validateDataDocument, validateVisualization, type DataClipDocumentV1, type DataViewType } from "../data/dataClipModel";
import { DataChart } from "../data/DataChart";
import { DataTableEditor } from "../data/DataTableEditor";
import "../data/dataClip.css";

type Props = { clipId?: string; returnTo: string };

export function DataClipEditorPage({ clipId, returnTo }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rawText, setRawText] = useState("");
  const [firstRowIsHeader, setFirstRowIsHeader] = useState(true);
  const [name, setName] = useState("データCLIP");
  const [document, setDocument] = useState<DataClipDocumentV1 | null>(null);
  const [undoStack, setUndoStack] = useState<DataClipDocumentV1[]>([]);
  const [redoStack, setRedoStack] = useState<DataClipDocumentV1[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(clipId));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const anchorRef = useRef<{ row: number; column: number } | null>(null);
  const allowNavigationRef = useRef(false);

  useBlocker({
    disabled: !isDirty,
    enableBeforeUnload: isDirty,
    shouldBlockFn: () => allowNavigationRef.current ? false : !window.confirm("未保存の変更を破棄しますか？"),
  });

  useEffect(() => {
    if (!clipId) return;
    let cancelled = false;
    getClip(clipId).then((clip) => {
      if (cancelled) return;
      if (clip.kind !== "data") throw new Error("データCLIPではありません。");
      if (!validateDataDocument(clip.data)) throw new Error("データCLIPの保存形式が不正です。");
      setName(clip.name);
      setDocument(cloneDocument(clip.data));
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "データCLIPを読み込めませんでした。"))
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [clipId]);

  function goBack() {
    if (isDirty && !window.confirm("未保存の変更を破棄しますか？")) return;
    allowNavigationRef.current = true;
    router.history.push(returnTo);
  }

  function importData() {
    try {
      const rows = parseDelimitedText(rawText);
      setDocument(createDataDocument(rows, firstRowIsHeader));
      setUndoStack([]);
      setRedoStack([]);
      setIsDirty(true);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "データを解析できませんでした。");
    }
  }

  function commit(next: DataClipDocumentV1) {
    if (!document) return;
    setUndoStack((stack) => [...stack.slice(-49), cloneDocument(document)]);
    setRedoStack([]);
    setDocument(next);
    setIsDirty(true);
  }

  function updateView(update: (next: DataClipDocumentV1) => void) {
    if (!document) return;
    const next = cloneDocument(document);
    update(next);
    setDocument(next);
    setIsDirty(true);
  }

  function undo() {
    const previous = undoStack.at(-1);
    if (!previous || !document) return;
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [...stack, cloneDocument(document)]);
    setDocument(previous);
    setIsDirty(true);
  }

  function redo() {
    const next = redoStack.at(-1);
    if (!next || !document) return;
    setRedoStack((stack) => stack.slice(0, -1));
    setUndoStack((stack) => [...stack, cloneDocument(document)]);
    setDocument(next);
    setIsDirty(true);
  }

  function deleteRows() {
    if (!document || document.rows.length <= document.selection.rowEnd - document.selection.rowStart + 1) return;
    const next = cloneDocument(document);
    next.rows.splice(next.selection.rowStart, next.selection.rowEnd - next.selection.rowStart + 1);
    next.selection = normalizeSelection(next.selection, next.rows.length, next.columns.length);
    commit(next);
  }

  function deleteColumns() {
    if (!document || document.columns.length <= document.selection.columnEnd - document.selection.columnStart + 1) return;
    const next = cloneDocument(document);
    const removedIds = new Set(next.columns.slice(next.selection.columnStart, next.selection.columnEnd + 1).map((column) => column.id));
    next.columns.splice(next.selection.columnStart, next.selection.columnEnd - next.selection.columnStart + 1);
    next.rows = next.rows.map((row) => row.filter((_, index) => index < document.selection.columnStart || index > document.selection.columnEnd));
    next.visualization.yColumnIds = next.visualization.yColumnIds.filter((id) => !removedIds.has(id));
    if (next.visualization.xColumnId && removedIds.has(next.visualization.xColumnId)) next.visualization.xColumnId = next.columns[0]?.id;
    next.selection = normalizeSelection(next.selection, next.rows.length, next.columns.length);
    commit(next);
  }

  async function save() {
    if (!document || !name.trim()) return;
    const validationError = validateVisualization(document);
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      if (clipId) await updateDataClip(clipId, name.trim(), document);
      else await createDataClip(name.trim(), document);
      await queryClient.invalidateQueries({ queryKey: ["clips"] });
      setIsDirty(false);
      allowNavigationRef.current = true;
      router.history.push(returnTo);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "データCLIPを保存できませんでした。もう一度お試しください。");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <Container className="data-editor-page"><div className="text-center py-5"><Spinner /></div></Container>;
  const selected = document ? selectedColumns(document) : [];
  const numeric = selected.filter((column) => column.type === "number");

  return <Container fluid className="data-editor-page">
    <header className="data-editor-header">
      <Button variant="light" aria-label="戻る" onClick={goBack}><ArrowLeft size={18} /></Button>
      <div><h1>{clipId ? "データCLIPを編集" : "データCLIPを作成"}</h1><p>表を整え、残したい範囲と表示方法を選択します。</p></div>
      {document && <Button variant="primary" onClick={() => void save()} disabled={isSaving || !name.trim()}><Save size={16} /> {isSaving ? "保存中…" : "保存"}</Button>}
    </header>
    {error && <Alert variant="danger">{error}</Alert>}
    {!document ? <section className="data-import-panel">
      <Form.Group><Form.Label>CSVまたはExcelのセルを貼り付け</Form.Label><Form.Control as="textarea" rows={14} value={rawText} onChange={(event) => setRawText(event.target.value)} autoFocus placeholder={'項目\t1月\t2月\n売上\t120\t150'} /></Form.Group>
      <div className="d-flex justify-content-between align-items-center mt-3"><Form.Check label="先頭行を列名として使う" checked={firstRowIsHeader} onChange={(event) => setFirstRowIsHeader(event.target.checked)} /><Button onClick={importData} disabled={!rawText.trim()}>データを読み込む</Button></div>
    </section> : <>
      <div className="data-editor-title-row"><Form.Control value={name} onChange={(event) => { setName(event.target.value); setIsDirty(true); }} aria-label="CLIPタイトル" />
        <ButtonGroup><Button variant="outline-secondary" onClick={undo} disabled={!undoStack.length} title="元に戻す"><Undo2 size={16} /></Button><Button variant="outline-secondary" onClick={redo} disabled={!redoStack.length} title="やり直す"><Redo2 size={16} /></Button></ButtonGroup>
        <Button variant="outline-secondary" onClick={() => commit(transposeDataDocument(document))} title="行と列を入れ替える"><Repeat2 size={15} /> 行列を転置</Button>
        <Button variant="outline-danger" onClick={deleteRows} disabled={document.rows.length <= document.selection.rowEnd - document.selection.rowStart + 1}><Trash2 size={15} /> 選択行</Button>
        <Button variant="outline-danger" onClick={deleteColumns} disabled={document.columns.length <= document.selection.columnEnd - document.selection.columnStart + 1}><Trash2 size={15} /> 選択列</Button>
        <Button variant="outline-secondary" onClick={() => { if (window.confirm("現在の編集内容を破棄して貼り付けからやり直しますか？")) { setDocument(null); setRawText(""); } }}>データを置換</Button>
      </div>
      <div className="data-editor-layout"><section className="data-editor-grid-panel">
        <DataTableEditor document={document}
          onSelectionChange={(row, column, extend) => updateView((next) => { if (!extend || !anchorRef.current) anchorRef.current = { row, column }; const anchor = anchorRef.current ?? { row, column }; next.selection = normalizeSelection({ rowStart: anchor.row, rowEnd: row, columnStart: anchor.column, columnEnd: column }, next.rows.length, next.columns.length); })}
          onCellChange={(row, column, value) => { const next = cloneDocument(document); next.rows[row][column] = value; commit(next); }}
          onColumnChange={(column, patch) => { const next = cloneDocument(document); Object.assign(next.columns[column], patch); commit(next); }} />
      </section><aside className="data-editor-preview-panel">
        <div className="data-view-controls"><Form.Label>表示方法</Form.Label><Form.Select value={document.visualization.type} onChange={(event) => updateView((next) => { next.visualization.type = event.target.value as DataViewType; })}>
          <option value="table">表</option><option value="line">折れ線</option><option value="bar">棒</option><option value="scatter">散布図</option><option value="kpi">KPI</option>
        </Form.Select>
        <Form.Label>グラフタイトル</Form.Label><Form.Control value={document.visualization.title} onChange={(event) => updateView((next) => { next.visualization.title = event.target.value; })} />
        {document.visualization.type !== "table" && document.visualization.type !== "kpi" && <><Form.Label>X軸</Form.Label><Form.Select value={document.visualization.xColumnId ?? ""} onChange={(event) => updateView((next) => { next.visualization.xColumnId = event.target.value; })}>{selected.map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}</Form.Select></>}
        {document.visualization.type !== "table" && <><Form.Label>{document.visualization.type === "kpi" ? "値" : "Y軸"}</Form.Label><Form.Select multiple={document.visualization.type === "line" || document.visualization.type === "bar"} value={document.visualization.type === "line" || document.visualization.type === "bar" ? document.visualization.yColumnIds : (document.visualization.yColumnIds[0] ?? "")} onChange={(event) => updateView((next) => { next.visualization.yColumnIds = Array.from(event.target.selectedOptions, (option) => option.value); })}>{numeric.map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}</Form.Select><Form.Label>単位</Form.Label><Form.Control value={document.visualization.unit} onChange={(event) => updateView((next) => { next.visualization.unit = event.target.value; })} /></>}
        {document.visualization.type === "kpi" && <><Form.Label>集計</Form.Label><Form.Select value={document.visualization.kpiAggregation} onChange={(event) => updateView((next) => { next.visualization.kpiAggregation = event.target.value as typeof next.visualization.kpiAggregation; })}><option value="latest">最新値</option><option value="sum">合計</option><option value="average">平均</option><option value="min">最小</option><option value="max">最大</option><option value="count">件数</option></Form.Select></>}
        </div><div className="data-editor-chart"><div className="data-editor-chart-title"><BarChart3 size={16} /> プレビュー</div><DataChart document={document} /></div>
      </aside></div>
    </>}
  </Container>;
}
