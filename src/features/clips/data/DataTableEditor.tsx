import { useEffect, useRef, useState } from "react";
import { Form } from "react-bootstrap";
import type { DataClipDocumentV1, DataColumnType } from "./dataClipModel";

type Props = {
  document: DataClipDocumentV1;
  onSelectionChange: (row: number, column: number, extend: boolean) => void;
  onCellChange: (row: number, column: number, value: string) => void;
  onColumnChange: (column: number, patch: { name?: string; type?: DataColumnType }) => void;
};

export function DataTableEditor({ document, onSelectionChange, onCellChange, onColumnChange }: Props) {
  const [editing, setEditing] = useState<{ row: number; column: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), [editing]);
  useEffect(() => {
    const stop = () => setDragging(false);
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);
  const { selection } = document;
  const selected = (row: number, column: number) => row >= selection.rowStart && row <= selection.rowEnd && column >= selection.columnStart && column <= selection.columnEnd;

  return (
    <div className="data-grid-wrap" tabIndex={0}>
      <table className="data-grid"><thead><tr><th className="data-grid-corner">#</th>{document.columns.map((column, index) => <th key={column.id}>
        <Form.Control size="sm" value={column.name} aria-label={`列${index + 1}の名前`} onChange={(event) => onColumnChange(index, { name: event.target.value })} />
        <Form.Select size="sm" value={column.type} aria-label={`${column.name}の型`} onChange={(event) => onColumnChange(index, { type: event.target.value as DataColumnType })}>
          <option value="string">文字</option><option value="number">数値</option><option value="date">日付</option>
        </Form.Select>
      </th>)}</tr></thead>
      <tbody>{document.rows.map((row, rowIndex) => <tr key={rowIndex}><th>{rowIndex + 1}</th>{document.columns.map((column, columnIndex) => {
        const isEditing = editing?.row === rowIndex && editing.column === columnIndex;
        return <td key={column.id} className={selected(rowIndex, columnIndex) ? "is-selected" : ""}
          onMouseDown={(event) => { if (event.button !== 0) return; setDragging(true); onSelectionChange(rowIndex, columnIndex, event.shiftKey); }}
          onMouseEnter={() => { if (dragging) onSelectionChange(rowIndex, columnIndex, true); }}
          onDoubleClick={() => setEditing({ row: rowIndex, column: columnIndex })}>
          {isEditing ? <input ref={inputRef} value={row[columnIndex] ?? ""} onChange={(event) => onCellChange(rowIndex, columnIndex, event.target.value)} onBlur={() => setEditing(null)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === "Escape") setEditing(null); }} /> : row[columnIndex]}
        </td>;
      })}</tr>)}</tbody></table>
    </div>
  );
}
