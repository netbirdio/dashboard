// Renders a `render_component` tool call's args inline. Payloads are
// validated server-side (assistant/agent/tools/ui.ts); unknown names render
// nothing.
"use client";

import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import { useToolResults } from "@/modules/assistant/hooks/useAssistantTools";
import { useRedactor } from "@/modules/assistant/utils/redaction";

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
}

type UIComponent = CanvasPreview | ResourceTable;

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
  const { restore } = useRedactor();
  // Streaming args arrive as partial JSON — fields exist one at a time.
  const entries = Object.entries(component.data ?? {});
  if (!component.title) return null;

  // The payload is model-written, so any string in it can carry tokens.
  const shown = (value: unknown): string => {
    const text = renderValue(value);
    return text === "—" ? text : restore(text);
  };

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-nb-gray-850 bg-nb-gray-920">
      <div className="border-b border-nb-gray-850 px-3.5 py-2">
        <div className="text-chat text-nb-gray-100">
          {restore(component.title)}
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
              {shown(value)}
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
  const toolResults = useToolResults();
  const { resolve, restore } = useRedactor();
  // Streaming args arrive as partial JSON — the columns land before the ids.
  const columns = component.columns ?? [];
  const ids = component.ids ?? [];

  // The server sends ids only — as tokens, since that's all the model holds —
  // joined here against the real rows stored when the tool executed. Table
  // data never passes through the model, so it can't garble values.
  const cell = (token: string, column: string): string => {
    const id = resolve(token) ?? token;
    const value = toolResults.field(id, column);
    if (column === "id") return restore(token);
    if (column === "name" && value === undefined) return restore(token);
    return value === undefined ? "—" : renderValue(value);
  };

  if (columns.length === 0 || ids.length === 0) return null;

  return (
    // Deliberately identical to a Markdown table: the user shouldn't have to
    // tell prose and tool results apart.
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
          {ids.map((id) => (
            <tr key={id}>
              {columns.map((column) => (
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
