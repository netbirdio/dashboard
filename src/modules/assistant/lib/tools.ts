import type { CanvasAgentApi } from "./canvas";
import type { ToolOutcome } from "./contract";
import { OPERATION_LABELS, TOOL_MANIFEST } from "./contract";
import { CONTROL_CENTER_TOOLS } from "./control-center";
import { ownEntry } from "./own";

export interface BrowserToolContext {
  navigate(href: string): void;
  onControlCenterPage(): boolean;
  currentUserId?: string;
  sessionId?: string;
  canvasWaitMs?: number;
}

// Must never throw; failures ride in `ok: false`.
export type BrowserToolExecutor = (
  input: unknown,
  ctx: BrowserToolContext,
) => Promise<ToolOutcome>;

export interface TrailDescription {
  label: string;
  detail?: string;
  // `undefined` keeps the host's default subject, `null` shows none.
  subject?: string | null;
}

export type ControlCenterToolAction = (
  input: Record<string, unknown>,
  api: CanvasAgentApi,
) => Promise<ToolOutcome>;

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

const FRAMEWORK_PREFIX = /^(?:eve|assistant)__/;

export const toolLabel = (name: string, _running = false): string => {
  const entry = ownEntry(TOOL_MANIFEST, name);
  if (entry) return entry.label;
  const words = name.replace(FRAMEWORK_PREFIX, "").replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

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
    return {
      label: skill ? `Load skill '${humanizeSlug(skill)}'` : "Load a skill",
      subject: null,
    };
  }
  if (name === "account_search") {
    // The host quotes the whole subject, so the join supplies only the inner quotes.
    const names = searchedNames(args);
    return { label: toolLabel(name, running), subject: names.length > 0 ? names.join("', '") : null };
  }
  return null;
}

function searchedNames(args: unknown): string[] {
  const terms = (args as { terms?: unknown } | null)?.terms;
  const names = [stringField(args, "term"), ...(Array.isArray(terms) ? terms : [])];
  return [...new Set(names.filter((n): n is string => typeof n === "string" && n.trim() !== "").map((n) => n.trim()))];
}

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
