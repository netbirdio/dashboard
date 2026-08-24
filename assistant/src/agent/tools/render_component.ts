import { z } from "zod";
import { defineTool, type ServerToolResult } from "@/agent/tools/_contract.ts";

export const RENDER_COMPONENT_TOOL = "render_component";

export const RESOURCE_KINDS = [
  "peer", "group", "policy", "route", "nameserver_group", "setup_key", "user", "event",
] as const;
const ResourceKind = z.enum(RESOURCE_KINDS);

const CanvasPreview = z.object({
  component: z.literal("canvas_preview"),
  title: z.string().min(1).max(120),
  resource: ResourceKind,
  data: z.record(z.string(), z.unknown()),
});

const ResourceTable = z.object({
  component: z.literal("resource_table"),
  columns: z.array(z.string().min(1)).min(1).max(12),
  ids: z.array(z.string()).min(1).max(500),
});

const ComponentSchema = z.discriminatedUnion("component", [CanvasPreview, ResourceTable]);
export type UIComponent = z.infer<typeof ComponentSchema>;

export const COMPONENT_NAMES = ["canvas_preview", "resource_table"] as const;

export type ComponentValidation =
  | { ok: true; component: UIComponent }
  | { ok: false; error: string };

export function validateComponent(json: unknown): ComponentValidation {
  const parsed = ComponentSchema.safeParse(json);
  return parsed.success
    ? { ok: true, component: parsed.data }
    : { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
}

// A rich inline component in place of prose UI.
export default defineTool({
  runtime: "server",
  description:
    "Render a rich inline UI component in your answer. Call this instead of describing structured UI in prose. " +
    "Use it sparingly, alongside a short line of Markdown. Components: " +
    "`canvas_preview` — preview a proposed change before it happens; " +
    "`resource_table` — a table of resources already fetched via a list/get tool. Do not use it for suggestion chips.",
  // The duplication with ComponentSchema is deliberate: that union generates as
  // an `anyOf`, and the model fills this flat shape far more reliably.
  inputSchema: {
    type: "object",
    properties: {
      component: { type: "string", enum: [...COMPONENT_NAMES], description: "Which component to render." },
      title: { type: "string", description: "canvas_preview: short heading for the change." },
      resource: { type: "string", enum: [...RESOURCE_KINDS], description: "canvas_preview: the NetBird resource kind the preview is about." },
      data: { type: "object", description: "canvas_preview: structured payload describing the previewed state." },
      columns: { type: "array", items: { type: "string" }, description: "resource_table: column keys, in order." },
      ids: { type: "array", items: { type: "string" }, description: "resource_table: ids of resources to render." },
    },
    required: ["component"],
  },
  execute: runComponentTool,
});
function runComponentTool(input: unknown): ServerToolResult {
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
  };
}
