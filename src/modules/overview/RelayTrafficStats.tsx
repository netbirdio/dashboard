"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/Select";
import useFetchApi from "@utils/api";
import { formatBytes } from "@utils/helpers";
import * as d3 from "d3";
import dayjs from "dayjs";
import React, { useEffect, useMemo, useRef } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { NetworkLog } from "@/interfaces/NetworkLog";
import { Pagination } from "@/interfaces/Pagination";
import { useOverviewRefresh } from "@/app/(dashboard)/overview/page";

type RangeValue = "6h" | "12h" | "24h" | "3d" | "7d";

type TrafficPoint = {
  timestamp: Date;
  uploadRate: number;
  downloadRate: number;
  uploadTotal: number;
  downloadTotal: number;
};

const WIDTH = 1320;
const HEIGHT = 380;
const MARGIN = { top: 28, right: 24, bottom: 46, left: 64 };

const rangeOptions: Array<{ value: RangeValue; hours: number; labelKey: string }> = [
  { value: "6h", hours: 6, labelKey: "overview.last6Hours" },
  { value: "12h", hours: 12, labelKey: "overview.last12Hours" },
  { value: "24h", hours: 24, labelKey: "overview.last24Hours" },
  { value: "3d", hours: 72, labelKey: "overview.last3Days" },
  { value: "7d", hours: 168, labelKey: "overview.last7Days" },
];

const bucketSecondsForHours = (hours: number) => {
  if (hours <= 6) return 5 * 60;
  if (hours <= 12) return 10 * 60;
  if (hours <= 24) return 20 * 60;
  if (hours <= 72) return 60 * 60;
  return 2 * 60 * 60;
};

const eventTimestamp = (log: NetworkLog) => {
  return log.events?.[0]?.timestamp ?? "";
};

const formatRate = (bytesPerSecond: number) => {
  return `${formatBytes(bytesPerSecond, bytesPerSecond >= 1024 * 1024 ? 2 : 1)}/s`;
};

const formatTotal = (bytes: number) => formatBytes(bytes, bytes >= 1024 * 1024 ? 2 : 1);

export function RelayTrafficStats() {
  const { t } = useI18n();
  const [range, setRange] = React.useState<RangeValue>("6h");
  const selectedRange = rangeOptions.find((option) => option.value === range) ?? rangeOptions[0];
  const endDate = useMemo(() => dayjs(), [range]);
  const startDate = useMemo(
    () => endDate.subtract(selectedRange.hours, "hour"),
    [endDate, selectedRange.hours],
  );

  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<any>(null);
  const { refreshTrigger, refreshInterval } = useOverviewRefresh();

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("page_size", "10000");
    params.set("start_date", startDate.toISOString());
    params.set("end_date", endDate.toISOString());
    params.set("sort_by", "timestamp");
    params.set("sort_order", "asc");
    return "/events/network-traffic";
  }, [endDate, startDate]);

  const { data: response, isLoading, mutate } = useFetchApi<Pagination<NetworkLog[]>>(
    apiUrl,
    false,
    false,
    true,
    {
      refreshInterval: refreshInterval > 0 ? refreshInterval : undefined,
    },
  );

  useEffect(() => {
    if (refreshTrigger > 0) {
      mutate();
    }
  }, [refreshTrigger, mutate]);

  const { points, totals, peaks } = useMemo(() => {
    const bucketSeconds = bucketSecondsForHours(selectedRange.hours);
    const bucketMs = bucketSeconds * 1000;
    const buckets = new Map<number, { upload: number; download: number }>();
    const startMs = startDate.valueOf();
    const endMs = endDate.valueOf();

    for (let ts = Math.floor(startMs / bucketMs) * bucketMs; ts <= endMs; ts += bucketMs) {
      buckets.set(ts, { upload: 0, download: 0 });
    }

    for (const log of response?.data ?? []) {
      const timestamp = dayjs(eventTimestamp(log));
      if (!timestamp.isValid()) continue;
      const bucket = Math.floor(timestamp.valueOf() / bucketMs) * bucketMs;
      const current = buckets.get(bucket) ?? { upload: 0, download: 0 };
      current.upload += log.tx_bytes ?? 0;
      current.download += log.rx_bytes ?? 0;
      buckets.set(bucket, current);
    }

    const chartPoints = Array.from(buckets.entries())
      .sort(([a], [b]) => a - b)
      .map(([timestamp, value]) => ({
        timestamp: new Date(timestamp),
        uploadRate: value.upload / bucketSeconds,
        downloadRate: value.download / bucketSeconds,
        uploadTotal: value.upload,
        downloadTotal: value.download,
      }));

    const totalUpload = Array.from(buckets.values()).reduce(
      (sum, value) => sum + value.upload,
      0,
    );
    const totalDownload = Array.from(buckets.values()).reduce(
      (sum, value) => sum + value.download,
      0,
    );

    return {
      points: chartPoints,
      totals: { upload: totalUpload, download: totalDownload },
      peaks: {
        upload: Math.max(1, ...chartPoints.map((point) => point.uploadRate)),
        download: Math.max(1, ...chartPoints.map((point) => point.downloadRate)),
      },
    };
  }, [endDate, response?.data, selectedRange.hours, startDate]);

  useEffect(() => {
    if (!svgRef.current || !gRef.current || points.length === 0) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);
    g.selectAll("*").remove();

    const maxRate = Math.max(1, peaks.upload, peaks.download);
    
    const xScale = d3
      .scaleTime()
      .domain([startDate.toDate(), endDate.toDate()])
      .range([MARGIN.left, WIDTH - MARGIN.right]);

    const yScale = d3
      .scaleLinear()
      .domain([-maxRate * 1.12, maxRate * 1.12])
      .range([HEIGHT - MARGIN.bottom, MARGIN.top]);

    const renderChart = (currentX: d3.ScaleTime<number, number>, currentY: d3.ScaleLinear<number, number>) => {
      g.selectAll("*").remove();

      const clipId = "chart-clip";
      const defs = g.append("defs");
      const clipPath = defs.append("clipPath").attr("id", clipId);
      clipPath.append("rect")
        .attr("x", MARGIN.left)
        .attr("y", MARGIN.top)
        .attr("width", WIDTH - MARGIN.left - MARGIN.right)
        .attr("height", HEIGHT - MARGIN.top - MARGIN.bottom);

      const chartGroup = g.append("g").attr("clip-path", `url(#${clipId})`);

      const yTicks = currentY.ticks(8);
      const xTicks = currentX.ticks(selectedRange.hours <= 12 ? 10 : 8);
      const timeFormat = selectedRange.hours <= 24 ? "MM-DD HH:mm" : "MM-DD";

      const gridGroup = g.append("g");
      yTicks.forEach((tick) => {
        gridGroup
          .append("line")
          .attr("x1", MARGIN.left)
          .attr("x2", WIDTH - MARGIN.right)
          .attr("y1", currentY(tick))
          .attr("y2", currentY(tick))
          .attr("stroke", "#e5e7eb");
        
        gridGroup
          .append("text")
          .attr("x", MARGIN.left - 8)
          .attr("y", currentY(tick) + 4)
          .attr("text-anchor", "end")
          .attr("fill", "#6b7280")
          .attr("font-size", "11px")
          .text(tick === 0 ? "0" : formatRate(Math.abs(tick)));
      });

      g.append("line")
        .attr("x1", MARGIN.left)
        .attr("x2", WIDTH - MARGIN.right)
        .attr("y1", currentY(0))
        .attr("y2", currentY(0))
        .attr("stroke", "#4b5563");

      const uploadArea = d3
        .area<TrafficPoint>()
        .x((point) => currentX(point.timestamp))
        .y0(currentY(0))
        .y1((point) => currentY(point.uploadRate))
        .curve(d3.curveMonotoneX);

      const downloadArea = d3
        .area<TrafficPoint>()
        .x((point) => currentX(point.timestamp))
        .y0(currentY(0))
        .y1((point) => currentY(-point.downloadRate))
        .curve(d3.curveMonotoneX);

      const uploadLine = d3
        .line<TrafficPoint>()
        .x((point) => currentX(point.timestamp))
        .y((point) => currentY(point.uploadRate))
        .curve(d3.curveMonotoneX);

      const downloadLine = d3
        .line<TrafficPoint>()
        .x((point) => currentX(point.timestamp))
        .y((point) => currentY(-point.downloadRate))
        .curve(d3.curveMonotoneX);

      chartGroup.append("path")
        .attr("d", uploadArea(points) ?? "")
        .attr("fill", "#9aa5b1")
        .attr("opacity", 0.85);

      chartGroup.append("path")
        .attr("d", downloadArea(points) ?? "")
        .attr("fill", "#64748b")
        .attr("opacity", 0.86);

      chartGroup.append("path")
        .attr("d", uploadLine(points) ?? "")
        .attr("fill", "none")
        .attr("stroke", "#64748b")
        .attr("stroke-width", 1.2);

      chartGroup.append("path")
        .attr("d", downloadLine(points) ?? "")
        .attr("fill", "none")
        .attr("stroke", "#9aa5b1")
        .attr("stroke-width", 1.2);

      const xAxisGroup = g.append("g");
      xTicks.forEach((tick) => {
        xAxisGroup
          .append("text")
          .attr("x", currentX(tick))
          .attr("y", HEIGHT - 16)
          .attr("text-anchor", "middle")
          .attr("fill", "#6b7280")
          .attr("font-size", "11px")
          .text(dayjs(tick).format(timeFormat));
      });

      const tooltip = g.append("g").style("display", "none");

      const overlay = g.append("rect")
        .attr("class", "overlay")
        .attr("x", MARGIN.left)
        .attr("y", MARGIN.top)
        .attr("width", WIDTH - MARGIN.left - MARGIN.right)
        .attr("height", HEIGHT - MARGIN.top - MARGIN.bottom)
        .attr("fill", "transparent")
        .style("cursor", "crosshair");

      const focus = g.append("g").style("display", "none");

      focus.append("line")
        .attr("class", "x-hover-line hover-line")
        .attr("y1", MARGIN.top)
        .attr("y2", HEIGHT - MARGIN.bottom)
        .attr("stroke", "#64748b")
        .attr("stroke-dasharray", "3,3")
        .attr("stroke-width", 1);

      const tooltipRect = tooltip.append("rect")
        .attr("rx", 6)
        .attr("ry", 6)
        .attr("fill", "#1e293b")
        .attr("fill-opacity", 0.95)
        .attr("stroke", "#334155");

      const tooltipText = tooltip.append("text")
        .attr("fill", "white")
        .attr("font-size", "12px")
        .style("pointer-events", "none");

      const bisect = d3.bisector<TrafficPoint, Date>((d) => d.timestamp).center;

      const handleMouseMove = (event: MouseEvent) => {
        const [mouseX] = d3.pointer(event);
        const x0 = currentX.invert(mouseX);
        const i = bisect(points, x0);
        const d0 = points[i - 1];
        const d1 = points[i];
        const d = (x0.getTime() - d0.timestamp.getTime() > d1.timestamp.getTime() - x0.getTime()) ? d1 : d0;

        focus.style("display", null);
        tooltip.style("display", null);
        
        focus
          .select(".x-hover-line")
          .attr("x1", currentX(d.timestamp))
          .attr("x2", currentX(d.timestamp));

        const lines: string[] = [];
        lines.push(dayjs(d.timestamp).format("YYYY-MM-DD HH:mm:ss"));
        lines.push(`${t("overview.uploadRate")}: ${formatRate(d.uploadRate)}`);
        lines.push(`${t("overview.downloadRate")}: ${formatRate(d.downloadRate)}`);
        if (d.uploadTotal > 0) {
          lines.push(`${t("overview.uploadTotal")}: ${formatTotal(d.uploadTotal)}`);
        }
        if (d.downloadTotal > 0) {
          lines.push(`${t("overview.downloadTotal")}: ${formatTotal(d.downloadTotal)}`);
        }

        tooltipText.selectAll("tspan").remove();
        lines.forEach((line, idx) => {
          tooltipText
            .append("tspan")
            .attr("x", 12)
            .attr("dy", idx === 0 ? 0 : "1.2em")
            .text(line);
        });

        const bbox = (tooltipText.node() as SVGTextElement)?.getBBox();
        if (bbox) {
          tooltipRect
            .attr("x", bbox.x - 4)
            .attr("y", bbox.y - 4)
            .attr("width", bbox.width + 24)
            .attr("height", bbox.height + 16);
        }

        let tx = currentX(d.timestamp) + 15;
        let ty = 20;

        if (tx > WIDTH / 2) {
          tx = currentX(d.timestamp) - (bbox ? bbox.width + 35 : 100);
        }

        tooltip.attr("transform", `translate(${tx},${ty})`);
      };

      overlay
        .on("mouseover", () => {
          focus.style("display", null);
          tooltip.style("display", null);
        })
        .on("mouseout", () => {
          focus.style("display", "none");
          tooltip.style("display", "none");
        })
        .on("mousemove", handleMouseMove);
    };

    renderChart(xScale, yScale);

    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 10])
      .on("zoom", (event) => {
        const newX = event.transform.rescaleX(xScale);
        renderChart(newX, yScale);
      });

    (svg as any).call(zoom);
    zoomRef.current = zoom;

  }, [points, peaks, startDate, endDate, selectedRange, t]);

  const resetZoom = () => {
    if (svgRef.current && zoomRef.current) {
      (d3.select(svgRef.current) as any).transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  return (
    <section className="h-[520px] rounded-md border border-neutral-200 bg-white p-5 shadow-sm dark:border-nb-gray-900 dark:bg-nb-gray-930 lg:col-span-2">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {t("overview.relayTrafficStats")}
          </h2>
          <span className="text-xs text-nb-gray-300">
            {t("overview.uploadPeak")}：{formatRate(peaks.upload)}
          </span>
          <span className="text-xs text-nb-gray-300">
            {t("overview.downloadPeak")}：{formatRate(peaks.download)}
          </span>
          <span className="text-xs text-nb-gray-300">
            {t("overview.uploadTotal")}：{formatTotal(totals.upload)}
          </span>
          <span className="text-xs text-nb-gray-300">
            {t("overview.downloadTotal")}：{formatTotal(totals.download)}
          </span>
          <button
            onClick={resetZoom}
            className="text-xs text-slate-500 hover:text-slate-700 dark:text-nb-gray-400 dark:hover:text-white cursor-pointer"
          >
            {t("overview.resetZoom")}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(value) => setRange(value as RangeValue)}>
            <SelectTrigger className="h-9 w-[124px] bg-neutral-50 dark:bg-nb-gray-900/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="w-[124px]">
              {rangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey as never)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative h-[430px]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className={isLoading ? "h-full w-full opacity-60" : "h-full w-full"}
          role="img"
          aria-label={t("overview.relayTrafficStats")}
        >
          <g ref={gRef} />
        </svg>

        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-8 text-xs text-neutral-600 dark:text-nb-gray-300">
        <LegendDot color="#9aa5b1" label={t("overview.uploadRate")} />
        <LegendDot color="#64748b" label={t("overview.downloadRate")} />
        <div className="text-xs text-slate-400 dark:text-nb-gray-500">
          {t("overview.zoomHint")}
        </div>
      </div>

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/30 text-sm text-nb-gray-300 backdrop-blur-[1px] dark:bg-nb-gray/20">
            {t("overview.loadingDistribution")}
          </div>
        )}
      </div>
    </section>
  );
}

function LegendDot({ color, label }: Readonly<{ color: string; label: string }>) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
