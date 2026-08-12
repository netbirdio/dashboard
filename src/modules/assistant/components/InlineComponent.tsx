/**
 * Inline components — the `component` SSE event, rendered as React.
 *
 * The contract is enforcement-based, not trust-based: the model can only produce
 * one of these by calling the server's `render_component` tool, and the server
 * validates the payload against a zod registry before emitting it. So anything
 * that reaches this file is already well-formed for a *known* component name. We
 * still switch exhaustively and render nothing for an unknown one, so a server
 * that adds a component before the dashboard knows it degrades quietly.
 *
 * Schema source of truth: netbird-assistant `src/ui/components.ts`.
 */
"use client";

import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import {
  useResourceStore,
  useRestorePlaceholders,
} from "../privacy/RedactorContext";

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
  key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function renderValue(value: unknown, restore: (t: string) => string): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return restore(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value.length
      ? value.map((v) => renderValue(v, restore)).join(", ")
      : "—";
  }
  if (typeof value === "object") return restore(JSON.stringify(value));
  return String(value);
}

function CanvasPreviewCard({ component }: { component: CanvasPreview }) {
  const restore = useRestorePlaceholders();
  const entries = Object.entries(component.data);

  return (
    // Same shell as a Markdown table and a code block (see `MarkdownText`):
    // one surface, a rule under the header, no rules between rows.
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
              {renderValue(value, restore)}
            </dd>
          </div>
        ))}
      </dl>

      {component.action && (
        <div className="border-t border-nb-gray-850 px-3.5 py-2">
          {/*
            A canvas_preview action names a mutating tool. Every tool in the
            current registry is read-only, so no action can actually arrive yet —
            and wiring a button that performs a change without routing it through
            the dashboard's confirmation gate would be the wrong shape. Show the
            intent, don't execute it.
          */}
          <div className="text-chat text-nb-gray-500">
            Proposed action:{" "}
            <span className="text-nb-gray-300">{component.action.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ResourceTableCard({ component }: { component: ResourceTable }) {
  const restore = useRestorePlaceholders();
  const resources = useResourceStore();

  /**
   * The server sends ids only, by design — a data-heavy table never passes
   * through the model, so it can't garble values. We join each id against the
   * rows we stored when we executed the tool.
   */
  const cell = (id: string, column: string): string => {
    // `name`/`id` collapse to one handle during redaction, so the identity
    // column comes from the token itself rather than the stored row.
    if (column === "name" || column === "id") return restore(id);

    const value = resources.field(id, column);
    return value === undefined ? "—" : renderValue(value, restore);
  };

  return (
    // Deliberately identical to a Markdown table: the user can't tell which
    // came from the model's prose and which from a tool result, and shouldn't
    // have to.
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

export function InlineComponent({ args }: ToolCallMessagePartProps) {
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

export default InlineComponent;
