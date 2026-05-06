"use client";

import useFetchApi from "@utils/api";
import * as d3 from "d3";
import React, { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { Peer } from "@/interfaces/Peer";
import { useOverviewRefresh } from "@/app/(dashboard)/overview/page";

type DeviceTypeSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

type SliceHover = {
  slice: DeviceTypeSlice;
  x: number;
  y: number;
};

const WIDTH = 720;
const HEIGHT = 520;
const CENTER_X = WIDTH / 2 + 18;
const CENTER_Y = HEIGHT / 2 + 28;
const RADIUS = 150;

const osColors: Record<string, string> = {
  android: "#7f8a97",
  ios: "#aeb5c0",
  linux: "#202631",
  macos: "#748190",
  windows: "#a8afb9",
  unknown: "#c4cad2",
};

const osOrder = ["android", "ios", "linux", "macos", "windows", "unknown"];

const normalizeOS = (os?: string) => {
  const value = os?.trim().toLowerCase() ?? "";
  if (!value) return "unknown";
  if (value.includes("android")) return "android";
  if (value === "ios" || value.includes("iphone") || value.includes("ipad")) return "ios";
  if (value.includes("linux")) return "linux";
  if (value.includes("darwin") || value.includes("mac")) return "macos";
  if (value.includes("windows") || value.includes("win")) return "windows";
  return value;
};

const formatPercent = (value: number, total: number) => {
  if (total === 0) return "0.00%";
  return `${((value / total) * 100).toFixed(2)}%`;
};

export function DeviceTypeDistribution() {
  const { t } = useI18n();
  const [hoveredSlice, setHoveredSlice] = useState<SliceHover | null>(null);
  const { refreshTrigger, refreshInterval } = useOverviewRefresh();
  const { data: peers, isLoading, mutate } = useFetchApi<Peer[]>(
    "/peers",
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

  const slices = useMemo<DeviceTypeSlice[]>(() => {
    const counts = new Map<string, number>();

    for (const peer of peers ?? []) {
      const os = normalizeOS(peer.os);
      counts.set(os, (counts.get(os) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([key, value]) => ({
        key,
        label: key === "macos" ? "macOS" : key,
        value,
        color: osColors[key] ?? "#8f98a6",
      }))
      .sort((a, b) => {
        const aOrder = osOrder.indexOf(a.key);
        const bOrder = osOrder.indexOf(b.key);
        if (aOrder !== -1 || bOrder !== -1) {
          return (aOrder === -1 ? 999 : aOrder) - (bOrder === -1 ? 999 : bOrder);
        }
        return b.value - a.value;
      });
  }, [peers]);

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const pie = d3
    .pie<DeviceTypeSlice>()
    .sort(null)
    .value((slice) => slice.value);
  const arcs = pie(slices);
  const arcPath = d3
    .arc<d3.PieArcDatum<DeviceTypeSlice>>()
    .innerRadius(0)
    .outerRadius(RADIUS);
  const outerArc = d3
    .arc<d3.PieArcDatum<DeviceTypeSlice>>()
    .innerRadius(RADIUS + 20)
    .outerRadius(RADIUS + 20);

  return (
    <section className="h-[600px] rounded-md border border-neutral-200 bg-white p-4 shadow-sm dark:border-nb-gray-900 dark:bg-nb-gray-930">
      <div className="relative h-full overflow-hidden rounded-md">
        <h2 className="absolute left-0 right-0 top-3 z-20 text-center text-lg font-semibold text-neutral-900 dark:text-white">
          {t("overview.deviceTypeDistribution")}
        </h2>

        <div className="absolute left-5 top-5 z-20 space-y-2 text-sm text-neutral-700 dark:text-nb-gray-200">
          {slices.map((slice) => (
            <div key={slice.key} className="flex items-center gap-2">
              <span
                className="h-3.5 w-7 rounded-[3px]"
                style={{ backgroundColor: slice.color }}
              />
              <span>{slice.label}</span>
            </div>
          ))}
        </div>

        {total === 0 && !isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-nb-gray-300">
            {t("overview.noDeviceTypeData")}
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className={isLoading ? "h-full w-full opacity-60" : "h-full w-full"}
            role="img"
            aria-label={t("overview.deviceTypeDistribution")}
          >
            <g transform={`translate(${CENTER_X},${CENTER_Y})`}>
              <defs>
                <filter id="device-type-slice-shadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow
                    dx="0"
                    dy="4"
                    stdDeviation="5"
                    floodColor="#111827"
                    floodOpacity="0.24"
                  />
                </filter>
              </defs>

              {arcs.map((arc) => {
                const isHovered = hoveredSlice?.slice.key === arc.data.key;
                const middleAngle = arc.startAngle + (arc.endAngle - arc.startAngle) / 2;
                const offset = isHovered ? 10 : 0;
                const x = Math.sin(middleAngle) * offset;
                const y = -Math.cos(middleAngle) * offset;

                return (
                  <path
                    key={arc.data.key}
                    d={arcPath(arc) ?? undefined}
                    fill={arc.data.color}
                    className="cursor-pointer stroke-white transition-opacity dark:stroke-nb-gray-930"
                    strokeWidth={1}
                    filter={isHovered ? "url(#device-type-slice-shadow)" : undefined}
                    opacity={hoveredSlice && !isHovered ? 0.72 : 1}
                    transform={`translate(${x},${y})`}
                    onPointerEnter={(event) =>
                      setHoveredSlice({
                        slice: arc.data,
                        x: event.clientX,
                        y: event.clientY,
                      })
                    }
                    onPointerMove={(event) =>
                      setHoveredSlice({
                        slice: arc.data,
                        x: event.clientX,
                        y: event.clientY,
                      })
                    }
                    onPointerLeave={() => setHoveredSlice(null)}
                  />
                );
              })}

              {arcs.map((arc) => {
                const middleAngle = arc.startAngle + (arc.endAngle - arc.startAngle) / 2;
                const isRightSide = middleAngle < Math.PI;
                const start = outerArc.centroid(arc);
                const endX = (isRightSide ? 1 : -1) * (RADIUS + 74);
                const endY = start[1];
                const textX = endX + (isRightSide ? 6 : -6);
                const label = `${arc.data.label} (${formatPercent(arc.data.value, total)})`;

                return (
                  <g key={`label-${arc.data.key}`}>
                    <polyline
                      points={`${arcPath.centroid(arc).join(",")} ${start.join(",")} ${endX},${endY}`}
                      className="fill-none stroke-slate-500 dark:stroke-nb-gray-300"
                      strokeWidth={1}
                    />
                    <text
                      x={textX}
                      y={endY + 4}
                      textAnchor={isRightSide ? "start" : "end"}
                      className="fill-neutral-800 text-xs dark:fill-nb-gray-100"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {hoveredSlice && (
          <div
            className="pointer-events-none fixed z-[100] min-w-[140px] rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-800 shadow-md dark:border-nb-gray-800 dark:bg-nb-gray-900 dark:text-white"
            style={{
              left: hoveredSlice.x + 12,
              top: hoveredSlice.y + 12,
            }}
          >
            <div className="mb-2 text-neutral-500 dark:text-nb-gray-300">
              {t("overview.deviceType")}
            </div>
            <div className="flex items-center justify-between gap-6">
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: hoveredSlice.slice.color }}
                />
                {hoveredSlice.slice.label}
              </span>
              <span className="font-semibold tabular-nums">
                {hoveredSlice.slice.value}
              </span>
            </div>
            <div className="mt-1 text-right text-neutral-500 dark:text-nb-gray-300">
              {formatPercent(hoveredSlice.slice.value, total)}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/30 text-sm text-nb-gray-300 backdrop-blur-[1px] dark:bg-nb-gray/20">
            {t("overview.loadingDistribution")}
          </div>
        )}
      </div>
    </section>
  );
}
