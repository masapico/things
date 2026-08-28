import { useRef, useState } from "react";
import { Alert, Button, ButtonGroup } from "react-bootstrap";
import { Clipboard, Download, Pencil, Table2 } from "lucide-react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { DataChart, type DataChartHandle } from "./DataChart";
import { exportCsv } from "./csv";
import { calculateKpi, selectedColumns, selectedRows, validateDataDocument, type DataClipDocumentV1 } from "./dataClipModel";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function DataClipViewer({ clipId, name, value }: { clipId: string; name: string; value: unknown }) {
  const navigate = useNavigate();
  const location = useLocation();
  const chartRef = useRef<DataChartHandle>(null);
  const [showTable, setShowTable] = useState(false);
  const [message, setMessage] = useState("");
  if (!validateDataDocument(value)) return <Alert variant="danger">データCLIPの保存形式が不正です。</Alert>;
  const document = value as DataClipDocumentV1;
  const displayDocument = showTable ? { ...document, visualization: { ...document.visualization, type: "table" as const } } : document;

  function downloadCsv(all: boolean) {
    const columns = all ? document.columns : selectedColumns(document);
    const rows = all ? document.rows : selectedRows(document);
    const indexes = columns.map((column) => document.columns.findIndex((candidate) => candidate.id === column.id));
    downloadBlob(new Blob([exportCsv(columns.map((column) => column.name), rows.map((row) => indexes.map((index) => row[index] ?? "")))], { type: "text/csv;charset=utf-8" }), `${name}.csv`);
  }

  async function copyPng() {
    let dataUrl = chartRef.current?.getPngDataUrl() ?? null;
    if (!dataUrl && document.visualization.type === "kpi") {
      const canvas = window.document.createElement("canvas");
      canvas.width = 1200; canvas.height = 630;
      const context = canvas.getContext("2d");
      const column = document.columns.find((item) => item.id === document.visualization.yColumnIds[0]);
      const index = document.columns.findIndex((item) => item.id === column?.id);
      const value = calculateKpi(selectedRows(document).map((row) => row[index] ?? ""), document.visualization.kpiAggregation);
      if (context) {
        context.fillStyle = "#fcfdfa"; context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#5b6b64"; context.font = "36px sans-serif"; context.textAlign = "center"; context.fillText(document.visualization.title || column?.name || "KPI", 600, 220);
        context.fillStyle = "#146b62"; context.font = "bold 88px sans-serif"; context.fillText(`${value?.toLocaleString("ja-JP") ?? "—"}${document.visualization.unit}`, 600, 365);
        dataUrl = canvas.toDataURL("image/png");
      }
    }
    if (!dataUrl) return;
    const blob = await (await fetch(dataUrl)).blob();
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("Clipboard API unavailable");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setMessage("PNGをクリップボードへコピーしました。");
    } catch {
      downloadBlob(blob, `${name}.png`);
      setMessage("クリップボードを利用できないためPNGをダウンロードしました。");
    }
  }

  return <div className="data-viewer">
    <div className="data-viewer-actions">
      <ButtonGroup size="sm"><Button variant={showTable ? "outline-secondary" : "secondary"} onClick={() => setShowTable(false)}>グラフ</Button><Button variant={showTable ? "secondary" : "outline-secondary"} onClick={() => setShowTable(true)}><Table2 size={14} /> 表</Button></ButtonGroup>
      <Button size="sm" variant="outline-secondary" onClick={() => downloadCsv(false)}><Download size={14} /> 選択範囲CSV</Button>
      <Button size="sm" variant="outline-secondary" onClick={() => downloadCsv(true)}><Download size={14} /> 全データCSV</Button>
      {!showTable && document.visualization.type !== "table" && <Button size="sm" variant="outline-secondary" onClick={() => void copyPng()}><Clipboard size={14} /> PNGコピー</Button>}
      <Button size="sm" variant="primary" onClick={() => void navigate({ to: "/clips/data/$clipid", params: { clipid: clipId }, search: { returnTo: location.href } })}><Pencil size={14} /> 再編集</Button>
    </div>
    {message && <Alert variant="info" className="py-2 mt-2">{message}</Alert>}
    <DataChart ref={chartRef} document={displayDocument} />
    <div className="data-viewer-meta">{document.rows.length.toLocaleString("ja-JP")} 行 × {document.columns.length.toLocaleString("ja-JP")} 列</div>
  </div>;
}
