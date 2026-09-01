import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, ScatterChart } from "echarts/charts";
import { DatasetComponent, GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { EChartsType } from "echarts/core";
import { calculateKpi, parseDate, parseNumber, selectedColumns, selectedRows, type DataClipDocument, type DataClipView } from "./dataClipModel";

echarts.use([BarChart, LineChart, ScatterChart, DatasetComponent, GridComponent, LegendComponent, TooltipComponent, SVGRenderer]);
export type DataChartHandle = { getSvgString: () => string | null };

function getCellValue(value: string, type: "string" | "number" | "date") {
  if (type === "number") return parseNumber(value);
  if (type === "date") return parseDate(value);
  return value;
}
function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] ?? character);
}

export const DataChart = forwardRef<DataChartHandle, { document: DataClipDocument; view: DataClipView; compact?: boolean }>(
  function DataChart({ document, view, compact = false }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<EChartsType | null>(null);
    const columns = selectedColumns(document, view);
    const rows = selectedRows(document, view);
    const { visualization } = view;
    const option = useMemo(() => {
      if (["table", "kpi"].includes(visualization.type)) return null;
      const xColumn = columns.find((column) => column.id === visualization.xColumnId);
      const yColumns = visualization.yColumnIds.map((id) => columns.find((column) => column.id === id)).filter((column) => column !== undefined);
      if (!xColumn || yColumns.length === 0) return null;
      const source = rows.map((row) => {
        const item: Record<string, string | number | null> = {};
        columns.forEach((column) => { item[column.id] = getCellValue(row[document.columns.findIndex((candidate) => candidate.id === column.id)] ?? "", column.type); });
        return item;
      });
      const isScatter = visualization.type === "scatter";
      return {
        animationDuration: compact ? 0 : 300,
        backgroundColor: "#ffffff",
        dataset: { source },
        grid: { left: compact ? 8 : 55, right: compact ? 8 : 24, top: compact ? 8 : 42, bottom: compact ? 8 : 62, containLabel: !compact },
        tooltip: compact ? undefined : { trigger: isScatter ? "item" : "axis" },
        legend: compact || yColumns.length < 2 ? undefined : { top: 4 },
        xAxis: {
          type: isScatter || xColumn.type === "number" || xColumn.type === "date" ? "value" : "category",
          show: !compact,
          name: compact ? undefined : xColumn.name,
          nameLocation: "middle",
          nameGap: 32,
        },
        yAxis: { type: "value", show: !compact, name: compact ? undefined : visualization.unit },
        series: yColumns.map((column) => ({ type: visualization.type, name: column.name, encode: { x: xColumn.id, y: column.id }, connectNulls: false, symbolSize: isScatter ? 8 : compact ? 0 : 5 })),
      };
    }, [columns, compact, document.columns, rows, visualization]);

    const usesECharts = visualization.type === "line" || visualization.type === "bar" || visualization.type === "scatter";
    useLayoutEffect(() => {
      if (!containerRef.current || !usesECharts) return;
      const chart = echarts.init(containerRef.current, undefined, { renderer: "svg" });
      chartRef.current = chart;
      const resize = new ResizeObserver(() => chart.resize());
      resize.observe(containerRef.current);
      return () => { resize.disconnect(); chart.dispose(); chartRef.current = null; };
    }, [compact, usesECharts, visualization.type]);
    useEffect(() => { if (option && chartRef.current) chartRef.current.setOption(option, { notMerge: true }); }, [option]);

    useImperativeHandle(ref, () => ({
      getSvgString: () => {
        if (chartRef.current) return chartRef.current.renderToSVGString({ useViewBox: true });
        if (visualization.type !== "kpi") return null;
        const column = columns.find((item) => item.id === visualization.yColumnIds[0]);
        const columnIndex = document.columns.findIndex((item) => item.id === column?.id);
        const value = calculateKpi(rows.map((row) => row[columnIndex] ?? ""), visualization.kpiAggregation);
        const title = escapeXml(visualization.title || column?.name || "KPI");
        const displayValue = escapeXml(`${value?.toLocaleString("ja-JP") ?? "—"}${visualization.unit}`);
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#fcfdfa"/><text x="600" y="220" text-anchor="middle" font-family="sans-serif" font-size="36" fill="#5b6b64">${title}</text><text x="600" y="365" text-anchor="middle" font-family="sans-serif" font-size="88" font-weight="bold" fill="#146b62">${displayValue}</text></svg>`;
      },
    }), [columns, document.columns, rows, visualization]);

    if (visualization.type === "table") return <div className={`data-preview-table-wrap${compact ? " data-preview-table-wrap--compact" : ""}`}><table className="table table-sm mb-0"><thead><tr>{columns.map((column) => <th key={column.id}>{column.name}</th>)}</tr></thead><tbody>{rows.slice(0, compact ? 4 : rows.length).map((row, rowIndex) => <tr key={rowIndex}>{columns.map((column) => <td key={column.id}>{row[document.columns.findIndex((item) => item.id === column.id)]}</td>)}</tr>)}</tbody></table></div>;
    if (visualization.type === "kpi") {
      const column = columns.find((item) => item.id === visualization.yColumnIds[0]);
      const columnIndex = document.columns.findIndex((item) => item.id === column?.id);
      const value = calculateKpi(rows.map((row) => row[columnIndex] ?? ""), visualization.kpiAggregation);
      return <div className={`data-kpi${compact ? " data-kpi--compact" : ""}`}><span>{visualization.title || column?.name || "KPI"}</span><strong>{value === null ? "—" : value.toLocaleString("ja-JP")}{visualization.unit}</strong></div>;
    }
    return <div ref={containerRef} className={`data-chart${compact ? " data-chart--compact" : ""}`} />;
  },
);
