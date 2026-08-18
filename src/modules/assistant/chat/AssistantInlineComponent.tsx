// Renders the `component` SSE event. Payloads are validated server-side
// (netbird-assistant `src/ui/components.ts`); unknown names render nothing.
"use client";

import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import { useToolResults } from "@/modules/assistant/hooks/useAssistantTools";

interface CanvasPreview {
  component: "canvas_preview";
  title: string;
  resource: string;
  data: Record<string, unknown>;
  action?: { label: string; tool: string; input: Record<string, unknown> };
}

interface ResourceTable {
  component: "resource_table";
  resource: string;
  columns: string[];
  ids: string[];
}

type UIComponent = CanvasPreview | ResourceTable;

const prettyKey = (key: string) =>
  key.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value.length
      ? value.map((v) => renderValue(v)).join(", ")
      : "—";
  }
  if (typeof value === "number") return value.toString();
  return JSON.stringify(value) ?? "—";
}

function CanvasPreviewCard({
  component,
}: Readonly<{ component: CanvasPreview }>) {
  const entries = Object.entries(component.data);

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-nb-gray-850 bg-nb-gray-920">
      <div className="border-b border-nb-gray-850 px-3.5 py-2">
        <div className="text-chat text-nb-gray-100">
          {component.title}
        </div>
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

      {component.action && (
        <div className="border-t border-nb-gray-850 px-3.5 py-2">
          {/* Shown, not executed: mutating actions must go through the
              dashboard's confirmation gate. */}
          <div className="text-chat text-nb-gray-500">
            Proposed action:{" "}
            <span className="text-nb-gray-300">{component.action.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ResourceTableCard({
  component,
}: Readonly<{ component: ResourceTable }>) {
  const toolResults = useToolResults();

  // The server sends ids only, joined here against the rows stored when the
  // tool executed — table data never passes through the model, so it can't garble values.
  const cell = (id: string, column: string): string => {
    const value = toolResults.field(id, column);
    if (column === "id") return id;
    if (column === "name" && value === undefined) return id;
    return value === undefined ? "—" : renderValue(value);
  };

  return (
    // Deliberately identical to a Markdown table: the user shouldn't have to
    // tell prose and tool results apart.
    <div className="my-3 overflow-x-auto rounded-lg border border-nb-gray-850 bg-nb-gray-920">
      <table className="w-full border-collapse text-chat">
        <thead className="border-b border-nb-gray-850 text-nb-gray-200">
          <tr>
            {component.columns.map((column) => (
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
          {component.ids.map((id) => (
            <tr key={id}>
              {component.columns.map((column) => (
                <td
                  key={column}
                  className="px-3.5 py-2.5 align-top text-nb-gray-200"
                >
                  {cell(id, column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AssistantInlineComponent({ args }: Readonly<ToolCallMessagePartProps>) {
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
