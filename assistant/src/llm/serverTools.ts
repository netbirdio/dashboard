/**
 * Dispatch for tools this server executes itself (runtime: "server"), as opposed
 * to the management tools the caller runs. The chat loop calls `runServerTool`
 * inline and feeds the result back to the model.
 *
 * A server tool may also push a side-channel SSE event via `emit` (e.g.
 * render_component emits a validated `component`); the chat route forwards it.
 *
 * Public tools (docs/API — see CACHEABLE_TOOLS) are served from a shared,
 * cross-customer TTL cache: their output is not user-specific, so a result
 * computed once serves everyone until it expires. Management tools never reach
 * here, so no account data is ever cached.
 */
import { loadConfig } from "@/config.ts";
import { isDocTool, runDocTool } from "@/docs/execute.ts";
import { runApiTool } from "@/docs/api.ts";
import { runComponentTool, RENDER_COMPONENT_TOOL } from "@/ui/render.ts";
import { runAskTool, ASK_USER_TOOL } from "@/ui/ask.ts";
import { CACHEABLE_TOOLS, stableKey, TtlCache } from "@/llm/serverToolCache.ts";
import { countServerToolCache, observeServerTool } from "@/telemetry/metrics.ts";

export interface ServerToolResult {
  /** false → returned as an error tool_result so the model can recover/retry. */
  ok: boolean;
  /** tool_result content shown to the model. */
  content: string;
  /** One-line progress summary for the UI. */
  summary: string;
  /** Optional extra SSE event to forward to the client (event name + payload). */
  emit?: { event: string; data: unknown };
  /**
   * The turn is over once this tool has run — the model is waiting on the user
   * (ask_user), so looping it back into the model would have it answer itself.
   */
  endsTurn?: boolean;
}

async function dispatch(name: string, input: unknown): Promise<ServerToolResult> {
  if (isDocTool(name)) return runDocTool(name, input);
  if (name === "get_api_reference") return runApiTool(input);
  if (name === RENDER_COMPONENT_TOOL) return runComponentTool(input);
  if (name === ASK_USER_TOOL) return runAskTool(input);
  return { ok: false, content: `unknown server tool: ${name}`, summary: "unknown tool" };
}

let cache: TtlCache<ServerToolResult> | null = null;
function toolCache(): TtlCache<ServerToolResult> {
  if (!cache) {
    const cfg = loadConfig();
    cache = new TtlCache(cfg.SERVER_TOOL_CACHE_TTL_SEC * 1000, cfg.SERVER_TOOL_CACHE_MAX);
  }
  return cache;
}

export async function runServerTool(name: string, input: unknown): Promise<ServerToolResult> {
  const cfg = loadConfig();
  const start = performance.now();
  const observe = (r: ServerToolResult): ServerToolResult => {
    observeServerTool(name, r.ok ? "ok" : "error", (performance.now() - start) / 1000);
    return r;
  };
  const cacheable = cfg.SERVER_TOOL_CACHE_ENABLED && CACHEABLE_TOOLS.has(name);
  if (!cacheable) return observe(await dispatch(name, input));

  const c = toolCache();
  const key = stableKey(name, input);
  const hit = c.get(key);
  if (hit) {
    countServerToolCache(name, "hit", c.size);
    return observe(hit);
  }
  countServerToolCache(name, "miss", c.size);

  const result = await dispatch(name, input);
  // Successes only. The `emit` rides along deliberately: a cacheable tool's
  // event is derived from its input (fetch_doc's `source` is the page it was
  // asked for), so replaying it from cache is exactly right — dropping cached
  // entries just because they emit would have made every doc read a live fetch.
  if (result.ok) c.set(key, result);
  return observe(result);
}
