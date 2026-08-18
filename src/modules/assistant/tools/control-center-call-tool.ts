// The shared frame every `cc_*` tool runs in: resolve the model's tokens,
// acquire the canvas, run the action, report the steps redacted. These tools
// may never deploy; that click stays the user's.
import type { ToolOutcome } from "@/interfaces/Assistant";
import type { Redactor } from "@/modules/assistant/utils/redaction";
import {
  AgentCanvasSnapshot,
  AgentNode,
  AgentStepResult,
  CanvasAgentApi,
  getCanvasAgent,
  waitForCanvasAgent,
} from "@/modules/control-center/agent/canvasAgentStore";

// The canvas' lock for one assistant turn. Nothing locks until a canvas tool
// actually runs — a turn that only answers a question must leave the page alone.
export { beginAgentTurn as beginCanvasTurn } from "@/modules/control-center/agent/canvasAgentStore";

// Pushed when a cc_ tool needs the canvas open and it isn't.
export const CONTROL_CENTER_HREF = "/control-center";

export interface TrailDescription {
  label: string;
  // Already formatted, quotes included — the caller renders it verbatim.
  detail?: string;
}

export type ControlCenterToolAction = (
  input: Record<string, unknown>,
  api: CanvasAgentApi,
  redactor: Redactor,
) => Promise<ToolOutcome>;

// How a call reads in the activity trail. Returns only what differs from the
// default (the tool's `done` label, no detail); the registry fills in the rest.
export type ControlCenterDescribeTrail = (
  input: Record<string, unknown>,
) => Partial<TrailDescription>;

// One action per tool call is the contract — each step gets its own activity
// row — but a list is still accepted so a model that batches isn't punished.
export function actions<T>(
  input: Record<string, unknown>,
  listKey: string,
): T[] {
  const list = input[listKey];
  if (Array.isArray(list)) return list as T[];
  return [input as T];
}

export interface ControlCenterContext {
  redactor: Redactor;
  navigate: (href: string) => void;
  onControlCenterPage: boolean;
}

export async function runControlCenterTool(
  action: ControlCenterToolAction,
  rawInput: unknown,
  { redactor, navigate, onControlCenterPage }: ControlCenterContext,
): Promise<ToolOutcome> {
  // Canvas inputs nest (cc_add items, cc_connect links), so every token the
  // model wrote — as a reference or inside prose — is resolved at any depth.
  const input = redactor.resolveDeep(
    (rawInput ?? {}) as Record<string, unknown>,
  ) as Record<string, unknown>;

  let api = getCanvasAgent();
  if (!api) {
    if (!onControlCenterPage) navigate(CONTROL_CENTER_HREF);
    api = await waitForCanvasAgent();
  }
  if (!api) {
    return {
      content:
        "The control center isn't open, so there's no canvas to work on. Tell the user to open it, or navigate there and try again.",
      isError: true,
    };
  }

  return action(input, api, redactor);
}

const nodeToken = (
  node: { nodeId: string; label: string },
  redactor: Redactor,
): string => redactor.handle("node", node.nodeId, node.label);

// Canvas id → token, for every node currently on screen.
function idTokens(
  snapshot: AgentCanvasSnapshot,
  redactor: Redactor,
): Map<string, string> {
  const ids = new Map<string, string>();
  snapshot.nodes.forEach((n) => ids.set(n.nodeId, nodeToken(n, redactor)));
  return ids;
}

// The bridge writes peers into step details as bare node ids; longest first,
// so `peer-draft-x` never gets eaten by a shorter id that prefixes it.
function tokeniseIds(detail: string, ids: Map<string, string>): string {
  let out = detail;
  for (const id of [...ids.keys()].sort((a, b) => b.length - a.length)) {
    if (out.includes(id)) out = out.split(id).join(ids.get(id)!);
  }
  return out;
}

// Node → what the model sees. A personal label (a peer's name) is dropped,
// not tokenised twice: its `entity` token is how the model refers to it.
function redactNode(
  node: AgentNode,
  redactor: Redactor,
): Record<string, unknown> {
  const entity = node.entity
    ? redactor.handle(node.entity.kind, node.entity.id, node.label)
    : undefined;
  return {
    id: nodeToken(node, redactor),
    kind: node.kind,
    ...(node.labelIsPersonal ? {} : { name: node.label }),
    ...(entity ? { entity } : {}),
    ...(node.placeholder ? { placeholder: node.placeholder } : {}),
    ...(node.enabled ? {} : { enabled: false }),
    ...(node.parentNodeId
      ? { inside: redactor.handle("node", node.parentNodeId, "frame") }
      : {}),
    ...(node.frame ? { frame: true } : {}),
    can: node.can,
  };
}

export function redactSnapshot(
  snapshot: AgentCanvasSnapshot,
  redactor: Redactor,
): Record<string, unknown> {
  // Nodes first: only they know the label, and a token's display value is set
  // by whoever mints it. Mint an edge endpoint first and the same token would
  // restore to a raw id in the answer.
  const nodes = snapshot.nodes.map((n) => redactNode(n, redactor));
  const subject = snapshot.subject
    ? redactor.handle(
        snapshot.subject.kind,
        snapshot.subject.id,
        snapshot.subject.label,
      )
    : undefined;
  return {
    mode: snapshot.mode,
    view: snapshot.view,
    ...(subject
      ? { subject: { kind: snapshot.subject!.kind, ref: subject } }
      : {}),
    ...(snapshot.drilledNetwork
      ? {
          drilled_into: redactor.handle(
            "node",
            snapshot.drilledNetwork,
            "network frame",
          ),
        }
      : {}),
    nodes,
    edges: snapshot.edges.map((e) => ({
      from: redactor.handle("node", e.from, e.from),
      to: redactor.handle("node", e.to, e.to),
    })),
    pending_changes: snapshot.changes,
  };
}

// Renders a batch's steps for the model, node ids tokenised.
export function reportSteps(
  steps: AgentStepResult[],
  api: CanvasAgentApi,
  redactor: Redactor,
): ToolOutcome {
  const ids = idTokens(api.snapshot(), redactor);
  // What the canvas did on its own since the last report (the debounced
  // auto-arrange, mostly), listed first because that's when it happened.
  const before = api.drainNotices().map((notice) => `· ${notice}`);
  const lines = steps.map((s, i) => {
    // A step that created a node is the only way the model learns its token.
    const created = s.nodeId ? ids.get(s.nodeId) : undefined;
    const suffix = created ? ` (${created})` : "";
    return `${i + 1}. ${s.ok ? "done" : "failed"}: ${tokeniseIds(
      s.detail,
      ids,
    )}${suffix}`;
  });
  return {
    content: JSON.stringify({
      steps: [...before, ...lines],
      // The canvas after the batch, so a follow-up call doesn't need cc_state.
      canvas: redactSnapshot(api.snapshot(), redactor),
    }),
    isError: steps.length > 0 && steps.every((s) => !s.ok),
  };
}
