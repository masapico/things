import { useRef, useState } from "react";
import { Alert, Button, Form } from "react-bootstrap";
import { Clipboard, Download, Pencil } from "lucide-react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { DataChart, type DataChartHandle } from "./DataChart";
import { exportCsv } from "./csv";
import { getDefaultView, normalizeDataDocument, selectedColumns, selectedRows } from "./dataClipModel";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}
function safeFilename(value: string) { return value.replace(/[\\/:*?"<>|]/g, "_").trim() || "data-clip"; }

export function DataClipViewer({ clipId, name, value }: { clipId: string; name: string; value: unknown }) {
  const navigate = useNavigate(); const location = useLocation(); const chartRef = useRef<DataChartHandle>(null);
  const document = normalizeDataDocument(value);
  const [activeViewId, setActiveViewId] = useState(() => document?.defaultViewId ?? "");
  const [message, setMessage] = useState("");
  if (!document) return <Alert variant="danger">データCLIPの保存形式が不正です。</Alert>;
  const dataDocument = document;
  const view = dataDocument.views.find((item) => item.id === activeViewId) ?? getDefaultView(dataDocument);

  function downloadCsv(all: boolean) {
    const columns = all ? dataDocument.columns : selectedColumns(dataDocument, view);
    const rows = all ? dataDocument.rows : selectedRows(dataDocument, view);
    const indexes = columns.map((column) => dataDocument.columns.findIndex((candidate) => candidate.id === column.id));
    downloadBlob(new Blob([exportCsv(columns.map((column) => column.name), rows.map((row) => indexes.map((index) => row[index] ?? "")))], { type: "text/csv;charset=utf-8" }), `${safeFilename(name)}.csv`);
  }
  function getSvg() { return chartRef.current?.getSvgString() ?? null; }
  function downloadSvg() {
    const svg = getSvg(); if (!svg) return;
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${safeFilename(name)}-${safeFilename(view.name)}.svg`); setMessage("SVGをダウンロードしました。");
  }
  async function copySvg() {
    const svg = getSvg(); if (!svg) return;
    try { await navigator.clipboard.writeText(svg); setMessage("SVGテキストをクリップボードへコピーしました。"); }
    catch { setMessage("クリップボードへコピーできませんでした。SVGダウンロードをご利用ください。"); }
  }

  return <div className="data-viewer">
    <div className="data-viewer-actions"><Form.Select size="sm" className="data-viewer-view-select" value={view.id} onChange={(event) => { setActiveViewId(event.target.value); setMessage(""); }}>{dataDocument.views.map((item) => <option key={item.id} value={item.id}>{item.name}{item.id === dataDocument.defaultViewId ? " ★" : ""}</option>)}</Form.Select>
      <Button size="sm" variant="outline-secondary" onClick={() => downloadCsv(false)}><Download size={14} /> 選択範囲CSV</Button><Button size="sm" variant="outline-secondary" onClick={() => downloadCsv(true)}><Download size={14} /> 全データCSV</Button>
      {view.visualization.type !== "table" && <><Button size="sm" variant="outline-secondary" onClick={downloadSvg}><Download size={14} /> SVG</Button><Button size="sm" variant="outline-secondary" onClick={() => void copySvg()}><Clipboard size={14} /> SVGをコピー</Button></>}
      <Button size="sm" variant="primary" onClick={() => void navigate({ to: "/clips/data/$clipid", params: { clipid: clipId }, search: { returnTo: location.href } })}><Pencil size={14} /> 再編集</Button>
    </div>{message && <Alert variant="info" className="py-2 mt-2">{message}</Alert>}<DataChart ref={chartRef} document={dataDocument} view={view} /><div className="data-viewer-meta">{dataDocument.rows.length.toLocaleString("ja-JP")} 行 × {dataDocument.columns.length.toLocaleString("ja-JP")} 列・{dataDocument.views.length} ビュー</div>
  </div>;
}
