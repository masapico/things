import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, ScatterChart } from "echarts/charts";
import { DatasetComponent, GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsType } from "echarts/core";
import { calculateKpi, parseDate, parseNumber, selectedColumns, selectedRows, type DataClipDocumentV1 } from "./dataClipModel";

echarts.use([BarChart, LineChart, ScatterChart, DatasetComponent, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

export type DataChartHandle = { getPngDataUrl: () => string | null };

function getCellValue(value: string, type: "string" | "number" | "date") {
  if (type === "number") return parseNumber(value);
  if (type === "date") return parseDate(value);
  return value;
}

export const DataChart = forwardRef<DataChartHandle, { document: DataClipDocumentV1; compact?: boolean }>(
  function DataChart({ document, compact = false }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<EChartsType | null>(null);
    const columns = selectedColumns(document);
    const rows = selectedRows(document);
    const { visualization } = document;

    const option = useMemo(() => {
      if (["table", "kpi"].includes(visualization.type)) return null;
      const xColumn = columns.find((column) => column.id === visualization.xColumnId);
      const yColumns = visualization.yColumnIds
        .map((id) => columns.find((column) => column.id === id))
        .filter((column) => column !== undefined);
      if (!xColumn || yColumns.length === 0) return null;
      const source = rows.map((row) => {
        const item: Record<string, string | number | null> = {};
        columns.forEach((column) => {
          item[column.id] = getCellValue(row[document.columns.findIndex((candidate) => candidate.id === column.id)] ?? "", column.type);
        });
        return item;
      });
      const isScatter = visualization.type === "scatter";
      return {
        animationDuration: compact ? 0 : 300,
        dataset: { source },
        grid: { left: compact ? 8 : 55, right: compact ? 8 : 24, top: compact ? 8 : 42, bottom: compact ? 8 : 45, containLabel: !compact },
        tooltip: compact ? undefined : { trigger: isScatter ? "item" : "axis" },
        legend: compact || yColumns.length < 2 ? undefined : { top: 4 },
        xAxis: { type: isScatter || xColumn.type === "number" || xColumn.type === "date" ? "value" : "category", show: !compact, name: compact ? undefined : xColumn.name },
        yAxis: { type: "value", show: !compact, name: compact ? undefined : visualization.unit },
        series: yColumns.map((column) => ({
          type: visualization.type,
          name: column.name,
          encode: { x: xColumn.id, y: column.id },
          connectNulls: false,
          symbolSize: isScatter ? 8 : compact ? 0 : 5,
        })),
      };
    }, [columns, compact, document.columns, rows, visualization]);

    const usesECharts = visualization.type === "line" || visualization.type === "bar" || visualization.type === "scatter";

    useLayoutEffect(() => {
      if (!containerRef.current || !usesECharts) return;
      const chart = echarts.init(containerRef.current);
      chartRef.current = chart;
      const resize = new ResizeObserver(() => chart.resize());
      resize.observe(containerRef.current);
      return () => {
        resize.disconnect();
        chart.dispose();
        chartRef.current = null;
      };
    }, [compact, usesECharts, visualization.type]);

    useEffect(() => {
      if (!option || !chartRef.current) return;
      chartRef.current.setOption(option, { notMerge: true });
    }, [option]);

    useImperativeHandle(ref, () => ({
      getPngDataUrl: () => chartRef.current?.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#ffffff" }) ?? null,
    }), []);

    if (visualization.type === "table") {
      return (
        <div key="table-preview" className={`data-preview-table-wrap${compact ? " data-preview-table-wrap--compact" : ""}`}>
          <table className="table table-sm mb-0"><thead><tr>{columns.map((column) => <th key={column.id}>{column.name}</th>)}</tr></thead>
            <tbody>{rows.slice(0, compact ? 4 : rows.length).map((row, rowIndex) => <tr key={rowIndex}>{columns.map((column) => <td key={column.id}>{row[document.columns.findIndex((item) => item.id === column.id)]}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    }

    if (visualization.type === "kpi") {
      const column = columns.find((item) => item.id === visualization.yColumnIds[0]);
      const columnIndex = document.columns.findIndex((item) => item.id === column?.id);
      const value = calculateKpi(rows.map((row) => row[columnIndex] ?? ""), visualization.kpiAggregation);
      return <div key="kpi-preview" className={`data-kpi${compact ? " data-kpi--compact" : ""}`}><span>{visualization.title || column?.name || "KPI"}</span><strong>{value === null ? "—" : value.toLocaleString("ja-JP")}{visualization.unit}</strong></div>;
    }

    return <div key="echarts-preview" ref={containerRef} className={`data-chart${compact ? " data-chart--compact" : ""}`} />;
  },
);
