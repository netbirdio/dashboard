import type { CanvasAgentApi } from "./canvas";
import type { ToolOutcome } from "./contract";
import { OPERATION_LABELS, TOOL_MANIFEST } from "./contract";
import { CONTROL_CENTER_TOOLS } from "./control-center";
import { ownEntry } from "./own";

/** What the host app gives a client executor to work with. */
export interface BrowserToolContext {
  navigate(href: string): void;
  onControlCenterPage(): boolean;
  currentUserId?: string;
  /**
   * The eve session this dispatch belongs to,
   * for executors that call back into the agent's session-scoped routes.
   * Undefined only before the first turn, when no dispatch can have arrived.
   */
  sessionId?: string;
  /** How long to wait for the control-center canvas; unset uses `waitForCanvasAgent`'s default. */
  canvasWaitMs?: number;
}

/**
 * A browser-side tool executor.
 * Inputs carry real values, and the outcome is POSTed back as-is.
 * Never throws; failures ride in `ok: false`.
 */
export type BrowserToolExecutor = (
  input: unknown,
  ctx: BrowserToolContext,
) => Promise<ToolOutcome>;

export interface TrailDescription {
  label: string;
  /** Already formatted, quotes included; rendered verbatim. */
  detail?: string;
  /**
   * What the row is about, overriding the host's "first string in the input" rule.
   * `undefined` keeps that rule, a string replaces it, and `null` shows no subject.
   */
  subject?: string | null;
}

export type ControlCenterToolAction = (
  input: Record<string, unknown>,
  api: CanvasAgentApi,
) => Promise<ToolOutcome>;

/** How a call reads in the activity trail; returns only what differs from the manifest label. */
export type ControlCenterDescribeTrail = (
  input: Record<string, unknown>,
) => Partial<TrailDescription>;

const ACRONYMS = new Set([
  "acl", "api", "cli", "dhcp", "dns", "http", "https", "id", "ip", "mfa",
  "nat", "sdk", "sso", "ssh", "tls", "ui", "url", "vpn",
]);

const MINOR_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or",
  "the", "to", "with",
]);

/**
 * A slug as a person would write it: `dns-resolution` becomes `DNS Resolution`.
 * Meant for ids such as skill names, never for real identifiers like a peer's hostname,
 * which the user must be able to recognise as written.
 */
export function humanizeSlug(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      if (index > 0 && MINOR_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

/**
 * The framework's tool prefix, and the one the agent's channel rewrites it to on the stream.
 * Stripped from fallback labels so the framework is never named to the user.
 */
const FRAMEWORK_PREFIX = /^(?:eve|assistant)__/;

/** The row's label; `running` is kept for callers, every label reads the same in both states. */
export const toolLabel = (name: string, _running = false): string => {
  const entry = ownEntry(TOOL_MANIFEST, name);
  if (entry) return entry.label;
  // an unlisted tool falls back to its name in sentence case
  const words = name.replace(FRAMEWORK_PREFIX, "").replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * How a guide load reaches the client: `assistant__skill` with `{ name }` on the stream,
 * or `eve__skill` when the client projects the load from its action kind,
 * which carries no tool name for the channel to rewrite.
 */
const LOAD_SKILL = new Set(["assistant__skill", "eve__skill"]);

function stringField(args: unknown, field: string): string | null {
  if (!args || typeof args !== "object") return null;
  const value = (args as Record<string, unknown>)[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function describeFrameworkTool(
  name: string,
  args: unknown,
  running: boolean,
): TrailDescription | null {
  if (LOAD_SKILL.has(name)) {
    const skill = stringField(args, "name") ?? stringField(args, "skill");
    // Present tense like every other row, running or done. `subject: null`
    // because the label already names the skill.
    return {
      label: skill ? `Load skill '${humanizeSlug(skill)}'` : "Load a skill",
      subject: null,
    };
  }
  if (name === "account_search") {
    // Every name the call looked up, quoted one by one; the host quotes the whole subject.
    const names = searchedNames(args);
    return { label: toolLabel(name, running), subject: names.length > 0 ? names.join("', '") : null };
  }
  return null;
}

/** The names an `account_search` call carries, in `term` and `terms`. */
function searchedNames(args: unknown): string[] {
  const terms = (args as { terms?: unknown } | null)?.terms;
  const names = [stringField(args, "term"), ...(Array.isArray(terms) ? terms : [])];
  return [...new Set(names.filter((n): n is string => typeof n === "string" && n.trim() !== "").map((n) => n.trim()))];
}

/** How one call reads in the trail row. */
export function describeToolCall(
  name: string,
  args: unknown,
  running = false,
): TrailDescription {
  if (ownEntry(CONTROL_CENTER_TOOLS, name)) return describeControlCenterTool(name, args);
  const operation = name === "netbird_api" ? ownEntry(OPERATION_LABELS, stringField(args, "operation") ?? "") : undefined;
  if (operation) return { label: operation.label };
  const framework = describeFrameworkTool(name, args, running);
  if (framework) return framework;
  return { label: toolLabel(name, running) };
}

export function describeControlCenterTool(
  name: string,
  args: unknown,
): TrailDescription {
  const tool = ownEntry(CONTROL_CENTER_TOOLS, name);
  if (!tool) return { label: name };
  const input = (args && typeof args === "object" ? args : {}) as Record<
    string,
    unknown
  >;
  return { label: toolLabel(name, false), ...tool.describe?.(input) };
}
