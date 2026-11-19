"use client";

import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import { cn } from "@utils/helpers";

interface CanvasPreview {
  component: "canvas_preview";
  title: string;
  resource: string;
  data: Record<string, unknown>;
}

interface ResourceTable {
  component: "resource_table";
  columns: string[];
  ids: string[];
  rows?: Record<string, string>[];
}

type UIComponent = CanvasPreview | ResourceTable;

const NOWRAP_UP_TO = 28;

const prettyKey = (key: string) =>
  key.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value.length ? value.map((v) => renderValue(v)).join(", ") : "—";
  }
  if (typeof value === "number") return value.toString();
  return JSON.stringify(value) ?? "—";
}

function CanvasPreviewCard({
  component,
}: Readonly<{ component: CanvasPreview }>) {
  // Streaming args arrive as partial JSON, so any field may still be missing.
  const entries = Object.entries(component.data ?? {});
  if (!component.title) return null;

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-nb-gray-850 bg-nb-gray-920">
      <div className="border-b border-nb-gray-850 px-3.5 py-2">
        <div className="text-chat text-nb-gray-100">{component.title}</div>
        <div className="text-[11px] uppercase tracking-wide text-nb-gray-400">
          {prettyKey(component.resource)}
        </div>
      </div>

      <dl>
        {entries.map(([key, value]) => (
          <div key={key} className="flex gap-3 px-3.5 py-2.5 text-chat">
            <dt className="w-1/3 shrink-0 text-nb-gray-400">
              {prettyKey(key)}
            </dt>
            <dd className="min-w-0 break-words text-nb-gray-200">
              {renderValue(value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ResourceTableCard({
  component,
}: Readonly<{ component: ResourceTable }>) {
  const columns = component.columns ?? [];
  const ids = component.ids ?? [];
  const rows = component.rows ?? [];

  const cell = (id: string, column: string, index: number): string => {
    const provided = rows[index]?.[column];
    if (typeof provided === "string" && provided.length) return provided;
    if (column === "id") return id;
    return "—";
  };

  if (columns.length === 0 || ids.length === 0) return null;

  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-nb-gray-850 bg-nb-gray-920">
      <table className="w-full border-collapse text-chat">
        <thead className="border-b border-nb-gray-850 text-nb-gray-200">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="whitespace-nowrap px-3.5 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide"
              >
                {prettyKey(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ids.map((id, index) => (
            <tr key={id}>
              {columns.map((column) => {
                const value = cell(id, column, index);
                return (
                  <td
                    key={column}
                    className={cn(
                      "px-3.5 py-2.5 align-top text-nb-gray-200",
                      value.length <= NOWRAP_UP_TO && "whitespace-nowrap",
                    )}
                  >
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AssistantInlineComponent({
  args,
}: Readonly<ToolCallMessagePartProps>) {
  const component = args as unknown as UIComponent;

  switch (component?.component) {
    case "canvas_preview":
      return <CanvasPreviewCard component={component} />;
    case "resource_table":
      return <ResourceTableCard component={component} />;
    default:
      return null;
  }
}
