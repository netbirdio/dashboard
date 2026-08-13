/**
 * Inline UI component contract. The assistant renders a rich component by calling
 * the `render_component` tool (see ui/render.ts); this module is the single source
 * of truth for the allowed set and their shapes. The server validates every call
 * against these schemas before emitting a `component` SSE event, so the frontend
 * only ever receives well-formed components. Safe to publish as a shared package
 * so the dashboard validates/renders against the exact same schemas.
 *
 * Deliberately a SMALL, stable starter set. Add a component by adding a schema to
 * the union here, its name to COMPONENT_NAMES, and (frontend) a renderer keyed on
 * `component`; the tool schema and validation pick it up automatically.
 */
import { z } from "zod";

/** NetBird resource kinds a component may reference (aligns with the tool set). */
export const RESOURCE_KINDS = [
  "peer", "group", "policy", "route", "nameserver_group", "setup_key", "user", "event",
] as const;
export const ResourceKind = z.enum(RESOURCE_KINDS);

/**
 * A preview of a proposed change the user can review before it happens. If
 * `action` is present, the dashboard renders a confirm button that runs the named
 * (mutating) tool with `action.input` — reusing the existing confirmation gate.
 */
const CanvasPreview = z.object({
  component: z.literal("canvas_preview"),
  title: z.string().min(1).max(120),
  resource: ResourceKind,
  /** Free-form structured payload describing the previewed state. */
  data: z.record(z.string(), z.unknown()),
  /** Optional call-to-action wiring a click to a client tool. */
  action: z
    .object({ label: z.string().min(1).max(40), tool: z.string().min(1), input: z.record(z.string(), z.unknown()) })
    .optional(),
});

/** A tabular view of resources the frontend already has from a tool_result. */
const ResourceTable = z.object({
  component: z.literal("resource_table"),
  resource: ResourceKind,
  /** Column keys to show, in order. */
  columns: z.array(z.string().min(1)).min(1).max(12),
  /** Ids of the resources to render (the frontend joins to its own data). */
  ids: z.array(z.string()).min(1).max(500),
});

/** All allowed components, discriminated on `component`. */
export const ComponentSchema = z.discriminatedUnion("component", [CanvasPreview, ResourceTable]);
export type UIComponent = z.infer<typeof ComponentSchema>;

/** Component names, for the system-prompt spec and quick membership checks. */
export const COMPONENT_NAMES = ["canvas_preview", "resource_table"] as const;

export type ComponentValidation =
  | { ok: true; component: UIComponent }
  | { ok: false; error: string };

/** Validate the JSON body of a `netbird-ui` fence against the registry. */
export function validateComponent(json: unknown): ComponentValidation {
  const parsed = ComponentSchema.safeParse(json);
  return parsed.success
    ? { ok: true, component: parsed.data }
    : { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
}
