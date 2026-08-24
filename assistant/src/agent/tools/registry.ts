// Every tool the assistant can call, discovered from this directory: a file at
// agent/tools/list_peers.ts is the tool named `list_peers`. Wire names must
// match the dashboard's own registry (src/modules/assistant/utils/tools.ts).
import { jsonSchema, tool, type ToolSet } from "ai";
import { LRUCache } from "lru-cache";
import { readdirSync } from "node:fs";
import { z } from "zod";
import type { ServerToolResult, ToolContext, ToolDefinition } from "@/agent/tools/_contract.ts";

export type { ServerToolResult, ToolContext, ToolDefinition };

const HERE = new URL(".", import.meta.url);

// Top-level .ts files only, minus the ones that opt out: this file, anything
// `_`-prefixed (the machinery tools share), and test or declaration files.
// Without the opt-outs a colocated list_peers.test.ts would be discovered as a
// tool named `list_peers.test` and take the process down at boot.
export function isToolFile(name: string): boolean {
  if (!name.endsWith(".ts") || name.endsWith(".d.ts")) return false;
  if (name === "registry.ts" || name.startsWith("_")) return false;
  return !/\.(test|spec)\.ts$/.test(name);
}

function toolFiles(): string[] {
  return readdirSync(HERE, { withFileTypes: true })
    .filter((e) => e.isFile() && isToolFile(e.name))
    .map((e) => e.name)
    .sort();
}

async function discover(): Promise<Record<string, ToolDefinition>> {
  const found: Record<string, ToolDefinition> = {};
  for (const file of toolFiles()) {
    const mod = (await import(new URL(file, HERE).pathname)) as { default?: ToolDefinition };
    if (!mod.default) throw new Error(`agent/tools/${file} has no default export — use defineTool()`);
    found[file.replace(/\.ts$/, "")] = mod.default;
  }
  return found;
}

export const TOOLS: Record<string, ToolDefinition> = await discover();

// The AI SDK tool set for streamText: server tools carry an execute (they run
// here), client tools don't (the dashboard fulfils them and resubmits).
export function buildToolSet(): ToolSet {
  const set: ToolSet = {};
  for (const [name, def] of Object.entries(TOOLS)) {
    const common = {
      description: def.description,
      inputSchema: jsonSchema<Record<string, unknown>>(
        def.inputSchema as Parameters<typeof jsonSchema>[0],
      ),
    };
    if (def.runtime !== "server") {
      set[name] = tool(common);
      continue;
    }
    set[name] = tool({
      ...common,
      execute: (input, { messages }): Promise<ServerToolResult> =>
        runServerTool(name, input, { messages }),
      // The model reads the plain content; the structured object (summary,
      // source, ok) is for the dashboard's tool part rendering.
      toModelOutput: ({ output }) => ({
        type: "text",
        value: (output as ServerToolResult).content,
      }),
    });
  }
  return set;
}

export function isServerTool(name: string): boolean {
  return TOOLS[name]?.runtime === "server";
}

export const CACHEABLE_TOOLS: ReadonlySet<string> = new Set(
  Object.entries(TOOLS)
    .filter(([, def]) => def.runtime === "server" && def.cache)
    .map(([name]) => name),
);

export function stableKey(name: string, input: unknown): string {
  return `${name}:${stableStringify(input)}`;
}

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const obj = v as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

async function dispatch(name: string, input: unknown, ctx: ToolContext): Promise<ServerToolResult> {
  const def = TOOLS[name];
  if (!def || def.runtime !== "server") {
    return { ok: false, content: `unknown server tool: ${name}`, summary: "unknown tool" };
  }
  if (!def.input) return def.execute(input, ctx);

  const parsed = def.input.safeParse(input);
  if (!parsed.success) return invalidInput(name, def.invalidHint, parsed.error);
  return def.execute(parsed.data, ctx);
}

// One recoverable rejection for every Zod-declared tool: name the fields that
// failed, then the retry. A model that cannot see the validator has to be told
// what it broke.
function invalidInput(name: string, hint: string | undefined, error: z.ZodError): ServerToolResult {
  const issues =
    error.issues
      .map((i) => (i.path.length ? `${i.path.join(".")} — ${i.message}` : i.message))
      .join("; ") || "it does not match the schema";
  return {
    ok: false,
    content: `Invalid input for ${name}: ${issues}. Fix the fields and call ${name} again${hint ? `, ${hint}` : "."}`,
    summary: `${name} input rejected`,
  };
}

const cache = new LRUCache<string, ServerToolResult>({ max: 500, ttl: 3600 * 1000 });

export async function runServerTool(
  name: string,
  input: unknown,
  ctx: ToolContext = { messages: [] },
): Promise<ServerToolResult> {
  if (!CACHEABLE_TOOLS.has(name)) return dispatch(name, input, ctx);

  const key = stableKey(name, input);
  const hit = cache.get(key);
  if (hit) return hit;

  const result = await dispatch(name, input, ctx);
  if (result.ok) cache.set(key, result);
  return result;
}
