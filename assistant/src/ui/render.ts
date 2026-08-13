/**
 * The `render_component` tool: how the model renders an inline UI component. It's
 * a server-executed tool (not a free-form fenced block), so the model's input is
 * schema-checked by the provider and then strictly validated here against the
 * component registry. On failure we return an error tool_result describing what's
 * wrong, so the model can retry or fall back to plain Markdown — an invalid
 * component can never reach the frontend.
 *
 * On success we emit a `component` SSE event (the chat route forwards it) and
 * return a trivial tool_result so the model continues its answer in the same turn.
 */
import type { LlmTool } from "@/types.ts";
import type { ServerToolResult } from "@/llm/serverTools.ts";
import { validateComponent, COMPONENT_NAMES, RESOURCE_KINDS } from "@/ui/components.ts";

export const RENDER_COMPONENT_TOOL = "render_component";

/** Tool spec advertised to the model. Zod (validateComponent) is the real gate. */
export const renderComponentSpec: LlmTool = {
  name: RENDER_COMPONENT_TOOL,
  description:
    "Render a rich inline UI component in your answer. Call this instead of describing structured UI in prose. " +
    "Use it sparingly, alongside a short line of Markdown. Components: " +
    "`canvas_preview` — preview a proposed change before it happens (include `action` only when the user clearly wants to make the change; it shows a confirm button that runs a mutating tool); " +
    "`resource_table` — a table of resources already fetched via a list/get tool. Do not use it for suggestion chips.",
  inputSchema: {
    type: "object",
    properties: {
      component: { type: "string", enum: [...COMPONENT_NAMES], description: "Which component to render." },
      title: { type: "string", description: "canvas_preview: short heading for the change." },
      resource: { type: "string", enum: [...RESOURCE_KINDS], description: "The NetBird resource kind the component is about." },
      data: { type: "object", description: "canvas_preview: structured payload describing the previewed state." },
      action: {
        type: "object",
        description: "canvas_preview: optional confirm button that runs a (mutating) tool.",
        properties: {
          label: { type: "string" },
          tool: { type: "string" },
          input: { type: "object" },
        },
        required: ["label", "tool", "input"],
      },
      columns: { type: "array", items: { type: "string" }, description: "resource_table: column keys, in order." },
      ids: { type: "array", items: { type: "string" }, description: "resource_table: ids of resources to render." },
    },
    required: ["component"],
  },
};

/** Validate a render_component call and, if valid, emit it as a `component` event. */
export function runComponentTool(input: unknown): ServerToolResult {
  const res = validateComponent(input);
  if (!res.ok) {
    return {
      ok: false,
      content: `Invalid component: ${res.error}. Fix the fields and call ${RENDER_COMPONENT_TOOL} again, or just answer in Markdown.`,
      summary: "Component rejected",
    };
  }
  return {
    ok: true,
    content: `Rendered ${res.component.component}.`,
    summary: `Rendered ${res.component.component}`,
    emit: { event: "component", data: res.component },
  };
}
