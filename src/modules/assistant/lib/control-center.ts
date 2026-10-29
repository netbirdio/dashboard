import type { AgentAddItem, AgentCanvasAction, AgentCanvasSnapshot, AgentDraftAction, AgentNavigateInput, AgentNode, AgentNodeAction, AgentPolicyEdit, AgentStepResult, CanvasAgentApi } from "./canvas";
import { getCanvasAgent, waitForCanvasAgent } from "./canvas";
import type { ToolOutcome } from "./contract";
import { ownEntry } from "./own";
import type { BrowserToolContext, ControlCenterDescribeTrail, ControlCenterToolAction } from "./tools";

export { beginAgentTurn } from "./canvas";

const textOf = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

/** `new_empty` becomes `New Empty`. */
const humanize = (value: string): string =>
  value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");

const quoted = (value?: string): string | undefined =>
  value ? `'${value}'` : undefined;

const labelFor = (table: Record<string, string>, key: string | undefined): string | undefined =>
  key === undefined ? undefined : ownEntry(table, key);

/*
  The shared frame every `control_center_*` tool runs in: acquire the canvas, run the action, report the steps.
  These tools never deploy; that click stays the user's.
  Inputs and reports carry real ids and labels; the agent tokenises them for the model.
*/

export const CONTROL_CENTER_HREF = "/control-center";

export async function runControlCenterTool(
  action: ControlCenterToolAction,
  rawInput: unknown,
  ctx: BrowserToolContext,
): Promise<ToolOutcome> {
  const input = (rawInput ?? {}) as Record<string, unknown>;

  let api = getCanvasAgent();
  if (!api) {
    if (!ctx.onControlCenterPage()) ctx.navigate(CONTROL_CENTER_HREF);
    api = await waitForCanvasAgent(ctx.canvasWaitMs);
  }
  if (!api) {
    return {
      ok: false,
      content:
        "The control center isn't open, so there's no canvas to work on. Tell the user to open it, or navigate there and try again.",
    };
  }

  return action(input, api);
}

function describeNode(node: AgentNode): Record<string, unknown> {
  return {
    id: node.nodeId,
    kind: node.kind,
    name: node.label,
    ...(node.entity ? { entity: node.entity } : {}),
    ...(node.placeholder ? { placeholder: node.placeholder } : {}),
    ...(node.enabled ? {} : { enabled: false }),
    ...(node.parentNodeId ? { inside: node.parentNodeId } : {}),
    ...(node.frame ? { frame: true } : {}),
    can: node.can,
  };
}

/*
  A report travels inside one chat request with whatever else its batch sends,
  so the canvas in it is projected to a fixed size rather than whole:
  a large account would otherwise make every canvas call too large to send.
  Each collection gets its own share, so a long change list cannot crowd out the nodes.
*/
const CANVAS_SHARES_BYTES = { nodes: 20_000, edges: 8_000, pending_changes: 4_000 };
const REPORT_MAX_STEPS = 40;

const utf8 = new TextEncoder();

/** The leading items that fit in `budget` UTF-8 bytes of JSON. */
function fitting<T>(items: readonly T[], budget: number): T[] {
  let used = 0;
  let count = 0;
  for (const item of items) {
    used += utf8.encode(JSON.stringify(item)).length + 1;
    if (used > budget) break;
    count += 1;
  }
  return items.slice(0, count);
}

type Truncated = Record<string, { shown: number; total: number }>;

/** `truncated` naming only the collections that were cut, or nothing. */
function truncation(counts: Record<string, [shown: number, total: number]>): { truncated?: Truncated } {
  const cut = Object.entries(counts).filter(([, [shown, total]]) => shown < total);
  if (cut.length === 0) return {};
  return { truncated: Object.fromEntries(cut.map(([key, [shown, total]]) => [key, { shown, total }])) };
}

export function snapshotReport(
  snapshot: AgentCanvasSnapshot,
): Record<string, unknown> {
  const nodes = fitting(snapshot.nodes.map(describeNode), CANVAS_SHARES_BYTES.nodes);
  // An edge to a node the model cannot see would name an id it has never been given.
  const shown = new Set(nodes.map((node) => node.id));
  const edges = fitting(
    snapshot.edges.filter((edge) => shown.has(edge.from) && shown.has(edge.to)),
    CANVAS_SHARES_BYTES.edges,
  );
  const changes = fitting(snapshot.changes, CANVAS_SHARES_BYTES.pending_changes);
  return {
    mode: snapshot.mode,
    view: snapshot.view,
    ...(snapshot.subject ? { subject: snapshot.subject } : {}),
    ...(snapshot.drilledNetwork
      ? { drilled_into: snapshot.drilledNetwork }
      : {}),
    nodes,
    edges,
    pending_changes: changes,
    ...truncation({
      nodes: [nodes.length, snapshot.nodes.length],
      edges: [edges.length, snapshot.edges.length],
      pending_changes: [changes.length, snapshot.changes.length],
    }),
  };
}

/** Step lines, the latest kept when there are too many; the latest name the nodes just made. */
function stepLines(lines: string[]): { steps: string[]; truncated?: Truncated } {
  const steps = lines.slice(-REPORT_MAX_STEPS);
  return { steps, ...truncation({ steps: [steps.length, lines.length] }) };
}

export function reportSteps(
  steps: AgentStepResult[],
  api: CanvasAgentApi,
): ToolOutcome {
  // What the canvas did on its own since the last report, listed first because it happened first.
  const before = api.drainNotices().map((notice) => `· ${notice}`);
  const lines = steps.map((s, i) => {
    // A step that created a node is the only way the model learns its id.
    const suffix = s.nodeId ? ` (${s.nodeId})` : "";
    return `${i + 1}. ${s.ok ? "done" : "failed"}: ${s.detail}${suffix}`;
  });
  const reported = stepLines([...before, ...lines]);
  return {
    ok: !(steps.length > 0 && steps.every((s) => !s.ok)),
    content: JSON.stringify({
      ...reported,
      // The canvas after the call, so a follow-up call doesn't need control_center_state.
      canvas: snapshotReport(api.getSnapshot()),
    }),
  };
}

// `control_center_state`
export const getCanvasSnapshot: ControlCenterToolAction = async (
  _input,
  api,
) => {
  // Drained here too, or the notices would surface later attributed to the next tool's steps.
  const notices = api.drainNotices().map((notice) => `· ${notice}`);
  const { truncated: stepsTruncated, ...steps } = stepLines(notices);
  const snapshot = snapshotReport(api.getSnapshot());
  // One `truncated` here, since the steps and the snapshot share the top level.
  const truncated = { ...stepsTruncated, ...(snapshot.truncated as Truncated | undefined) };
  return {
    ok: true,
    content: JSON.stringify({
      ...(notices.length > 0 ? steps : {}),
      ...snapshot,
      ...(Object.keys(truncated).length > 0 ? { truncated } : {}),
    }),
  };
};

// `control_center_navigate`
const str = (value: unknown): string => (typeof value === "string" ? value : "");

export const gotoView: ControlCenterToolAction = async (input, api) => {
  const step = await api.goToView({
    view: str(input.view) as AgentNavigateInput["view"],
    target: typeof input.target === "string" ? input.target : undefined,
  });
  return reportSteps([step], api);
};

export const describeGotoView: ControlCenterDescribeTrail = (input) => {
  const view = nonEmptyString(input.view);
  const target = textOf(input.target);
  return { detail: quoted(target ?? (view ? humanize(view) : undefined)) };
};

// `control_center_draft`. Each action owns its whole phrase, since "Set up a draft 'Exit'" would mislead.
const DRAFT_ACTION_LABELS: Record<string, string> = {
  new_empty: "Start an empty draft",
  from_current_view: "Start a draft from this view",
  exit: "Leave the draft",
};

export const createDraft: ControlCenterToolAction = async (input, api) => {
  const step = await api.draftAction(str(input.action) as AgentDraftAction);
  return reportSteps([step], api);
};

export const describeCreateDraft: ControlCenterDescribeTrail = (input) => {
  const action = nonEmptyString(input.action);
  const label = labelFor(DRAFT_ACTION_LABELS, action);
  if (label) return { label };
  return { detail: quoted(action ? humanize(action) : undefined) };
};

// `control_center_add`
const ADD_NEEDS_KIND = "control_center_add needs a `kind`.";

const toAddItem = (input: Record<string, unknown>): AgentAddItem | null =>
  nonEmptyString(input.kind)
    ? {
        kind: String(input.kind) as AgentAddItem["kind"],
        ref: nonEmptyString(input.ref),
        role: nonEmptyString(input.role) as AgentAddItem["role"],
        bidirectional:
          typeof input.bidirectional === "boolean" ? input.bidirectional : undefined,
        name: nonEmptyString(input.name),
        description: nonEmptyString(input.description),
        address: nonEmptyString(input.address),
        network: nonEmptyString(input.network),
        members: Array.isArray(input.members)
          ? input.members.filter((m): m is string => typeof m === "string" && !!m)
          : undefined,
      }
    : null;

/** The objects of a call's `items` or `links`, or of the flat input when there is no list. */
const listOf = (input: Record<string, unknown>, key: string): Record<string, unknown>[] => {
  const list = input[key];
  if (Array.isArray(list)) {
    return list.filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x));
  }
  return [input];
};

export const addNode: ControlCenterToolAction = async (input, api) => {
  const items = listOf(input, "items").map(toAddItem);
  if (items.length === 0 || items.includes(null)) return { ok: false, content: ADD_NEEDS_KIND };
  const steps = await api.addNodes(items as AgentAddItem[], input.final === true);
  return reportSteps(steps, api);
};

const describeOne = (input: Record<string, unknown>): string | undefined => {
  const kind = nonEmptyString(input.kind);
  return textOf(input.name) ?? textOf(input.ref) ?? (kind ? humanize(kind) : undefined);
};

export const describeAddNode: ControlCenterDescribeTrail = (input) => {
  const items = listOf(input, "items");
  if (items.length > 1) {
    const names = items.map(describeOne).filter((n): n is string => !!n);
    return { detail: quoted(names.join(", ")) };
  }
  return { detail: quoted(describeOne(items[0] ?? input)) };
};

// `control_center_connect`
const CONNECT_NEEDS_ENDS = "control_center_connect needs `from` and `to`.";

export const connectNodes: ControlCenterToolAction = async (input, api) => {
  const links = listOf(input, "links");
  if (links.length === 0 || links.some((l) => !nonEmptyString(l.from) || !nonEmptyString(l.to))) {
    return { ok: false, content: CONNECT_NEEDS_ENDS };
  }
  const steps = await api.connectNodes(
    links.map((l) => ({ from: String(l.from), to: String(l.to) })),
    input.final === true,
  );
  return reportSteps(steps, api);
};

export const describeConnectNodes: ControlCenterDescribeTrail = (input) => {
  const links = listOf(input, "links");
  const one = (l: Record<string, unknown>) => {
    const from = quoted(textOf(l.from));
    const to = quoted(textOf(l.to));
    return from && to ? `${from} to ${to}` : from ?? to;
  };
  if (links.length > 1) return { detail: links.map(one).filter(Boolean).join(", ") };
  return { detail: one(links[0] ?? input) };
};

// `control_center_node`
const NODE_ACTION_LABELS: Record<string, string> = {
  rename: "Rename",
  remove: "Remove",
  delete: "Delete",
  enable: "Enable",
  disable: "Disable",
  focus: "Focus",
  unfocus: "Clear focus",
  move: "Move",
  add_to_group: "Add to group",
  route_network: "Set routing peer",
  details: "Open details",
};

const NODE_NEEDS_ACTION = "control_center_node needs `node` and `action`.";

/** NaN coordinates make a node vanish from the layout engine, so such a position is dropped. */
function finitePosition(value: unknown): { x: number; y: number } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const x = Number((value as { x?: unknown }).x ?? 0);
  const y = Number((value as { y?: unknown }).y ?? 0);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  return { x, y };
}

export const editNode: ControlCenterToolAction = async (input, api) => {
  const action = nonEmptyString(input.action);
  if (!nonEmptyString(input.node) || !action) return { ok: false, content: NODE_NEEDS_ACTION };
  if (!labelFor(NODE_ACTION_LABELS, action)) {
    return { ok: false, content: `control_center_node has no action \`${action}\`.` };
  }
  const steps = await api.editNodes(
    [
      {
        node: String(input.node),
        action: action as AgentNodeAction["action"],
        name: nonEmptyString(input.name),
        group: nonEmptyString(input.group),
        network: nonEmptyString(input.network),
        position: finitePosition(input.position),
      },
    ],
    input.final === true,
  );
  return reportSteps(steps, api);
};

export const describeEditNode: ControlCenterDescribeTrail = (input) => {
  const verb = nonEmptyString(input.action);
  const subject = quoted(textOf(input.node));
  // e.g. "Set routing peer 'Office Router' to 'Office'"
  const target = quoted(
    textOf(input.name) ?? textOf(input.group) ?? textOf(input.network),
  );
  const label = labelFor(NODE_ACTION_LABELS, verb);
  return {
    ...(label ? { label } : {}),
    detail:
      subject && target && verb !== "move"
        ? `${subject} to ${target}`
        : subject,
  };
};

// `control_center_policy`
export const editPolicy: ControlCenterToolAction = async (input, api) => {
  if (typeof input.node !== "string")
    return { ok: false, content: "control_center_policy needs the policy's `node`." };
  const step = await api.editPolicy(
    {
      node: input.node,
      name: nonEmptyString(input.name),
      description: nonEmptyString(input.description),
      enabled: typeof input.enabled === "boolean" ? input.enabled : undefined,
      protocol: nonEmptyString(input.protocol) as AgentPolicyEdit["protocol"],
      ports: Array.isArray(input.ports) ? input.ports.map(String) : undefined,
      bidirectional:
        typeof input.bidirectional === "boolean"
          ? input.bidirectional
          : undefined,
    },
    input.final === true,
  );
  return reportSteps([step], api);
};

export const describeEditPolicy: ControlCenterDescribeTrail = (input) => ({
  detail: quoted(textOf(input.node)),
});

// `control_center_canvas`
const CANVAS_ACTION_LABELS: Record<string, string> = {
  auto_arrange: "Arrange the canvas",
  fit_view: "Fit the view",
  zoom_in: "Zoom in",
  zoom_out: "Zoom out",
};

export const arrangeCanvas: ControlCenterToolAction = async (input, api) => {
  const step = await api.canvasAction(
    str(input.action) as AgentCanvasAction,
  );
  return reportSteps([step], api);
};

export const describeArrangeCanvas: ControlCenterDescribeTrail = (input) => {
  const label = labelFor(CANVAS_ACTION_LABELS, nonEmptyString(input.action));
  return label ? { label } : {};
};

export interface ControlCenterToolEntry {
  action: ControlCenterToolAction;
  describe?: ControlCenterDescribeTrail;
}

/** Wire name to executor and trail formatter. */
export const CONTROL_CENTER_TOOLS: Record<string, ControlCenterToolEntry> = {
  control_center_state: { action: getCanvasSnapshot },
  control_center_navigate: { action: gotoView, describe: describeGotoView },
  control_center_draft: { action: createDraft, describe: describeCreateDraft },
  control_center_add: { action: addNode, describe: describeAddNode },
  control_center_connect: { action: connectNodes, describe: describeConnectNodes },
  control_center_node: { action: editNode, describe: describeEditNode },
  control_center_policy: { action: editPolicy, describe: describeEditPolicy },
  control_center_canvas: { action: arrangeCanvas, describe: describeArrangeCanvas },
};
