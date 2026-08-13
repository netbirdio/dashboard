/**
 * The control-center half of the assistant's tool set — the tools that DRAW
 * rather than read.
 *
 * These don't touch the management API at all: they drive the canvas the user is
 * looking at, through the same hooks the human UI uses (see
 * `control-center/agent/CanvasAgentBridge`). Everything they can do is
 * draft-local or camera work — deploying a draft stays a human click.
 *
 * Two things make them safe to hand a model:
 *  - **Nodes are tokens.** A canvas node goes out as `{NODE_4}`; peer names
 *    never do. A node also carries the token of the account entity behind it
 *    (`{PEER_3}`), which is how the model lines the canvas up with what it read
 *    from `list_peers`.
 *  - **The page must be open.** If the control center isn't mounted there's no
 *    canvas to drive, so the executor navigates there first and waits for it.
 */
import type { Redactor } from "../privacy/redaction";
import {
  AgentCanvasSnapshot,
  AgentNode,
  AgentStepResult,
  beginAgentTurn,
  CanvasAgentApi,
  getCanvasAgent,
  waitForCanvasAgent,
} from "@/modules/control-center/agent/canvasAgentStore";

/**
 * The canvas' lock for one assistant turn, re-exported so the runtime has a
 * single seam onto the control center (it already knows nothing else about it).
 *
 * Nothing locks until a canvas tool actually runs — a turn that only answers a
 * question must leave the page alone.
 */
export { beginAgentTurn as beginCanvasTurn };

export const CC_TOOLS = [
  "cc_state",
  "cc_navigate",
  "cc_draft",
  "cc_add",
  "cc_connect",
  "cc_node",
  "cc_policy",
  "cc_canvas",
] as const;

export type CcTool = (typeof CC_TOOLS)[number];

export const isControlCenterTool = (name: string): name is CcTool =>
  (CC_TOOLS as readonly string[]).includes(name);

/**
 * Activity-trail labels (see TOOL_LABELS in clientTools). Both tenses are the
 * same imperative phrase for these: the canvas tools read as a list of moves
 * ("Add to draft 'Server'", "Connect 'Players' to 'Access'"), and a past-tense
 * label with the subject attached ("Added to the draft 'Server'") reads like a
 * sentence that lost its way.
 *
 * `controlCenterActivity` supplies the subject and, for the tools whose action
 * IS the verb (cc_draft, cc_node, cc_canvas), replaces the label outright — so
 * these are the fallback for an action this dashboard version doesn't know.
 */
export const CC_TOOL_LABELS: Record<
  CcTool,
  { running: string; done: string }
> = {
  cc_state: { running: "Read the canvas", done: "Read the canvas" },
  cc_navigate: {
    running: "Open the control center",
    done: "Open the control center",
  },
  cc_draft: { running: "Set up a draft", done: "Set up a draft" },
  cc_add: { running: "Add to draft", done: "Add to draft" },
  cc_connect: { running: "Connect", done: "Connect" },
  cc_node: { running: "Edit the draft", done: "Edit the draft" },
  cc_policy: { running: "Edit policy", done: "Edit policy" },
  cc_canvas: { running: "Arrange the canvas", done: "Arrange the canvas" },
};

/** `new_empty` → `New Empty`: enum values are for the wire, not for reading. */
const humanize = (value: string): string =>
  value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");

/**
 * The draft actions as whole phrases. A shared "Set up a draft" label with the
 * action as its subject produced "Set up a draft 'Leave Draft'" — leaving is not
 * a kind of setting up, so the action owns the verb here too.
 */
const DRAFT_VERBS: Record<string, string> = {
  new_empty: "Start an empty draft",
  from_current_view: "Start a draft from this view",
  exit: "Leave the draft",
};

/** Per-action verbs for cc_node — "Rename" says far more than "Edit the draft". */
const NODE_VERBS: Record<string, string> = {
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

const CANVAS_VERBS: Record<string, string> = {
  auto_arrange: "Arrange the canvas",
  fit_view: "Fit the view",
  zoom_in: "Zoom in",
  zoom_out: "Zoom out",
};

export interface CcActivity {
  label: string;
  /** Already formatted, quotes included — the caller renders it verbatim. */
  detail?: string;
}

/**
 * How a control-center call reads in the activity trail: the move, then what it
 * was made to.
 *
 * The generic "first string in the input" rule the other tools use falls apart
 * here — it surfaced a raw enum (`'new_empty'`), a bare kind (`'server'`), or one
 * end of a connection. `restore` turns the `{NODE_n}` placeholders back into the
 * labels the user sees on the canvas.
 */
export function controlCenterActivity(
  name: CcTool,
  args: unknown,
  restore: (text: string) => string,
): CcActivity {
  const input = (args && typeof args === "object" ? args : {}) as Record<
    string,
    unknown
  >;
  const label = CC_TOOL_LABELS[name].done;
  const text = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim() ? restore(value.trim()) : undefined;
  const quoted = (value?: string) => (value ? `'${value}'` : undefined);

  switch (name) {
    case "cc_draft": {
      const action = str(input.action);
      // The verb says all of it; a subject would only repeat the verb.
      if (action && DRAFT_VERBS[action]) return { label: DRAFT_VERBS[action] };
      return { label, detail: quoted(action && humanize(action)) };
    }
    case "cc_navigate": {
      const view = str(input.view);
      const target = text(input.target);
      return {
        label,
        detail: quoted(target ?? (view ? humanize(view) : undefined)),
      };
    }
    case "cc_add": {
      // One item per call is the contract; a batched list is named by its first.
      const item = Array.isArray(input.items)
        ? ((input.items[0] ?? {}) as Record<string, unknown>)
        : input;
      const kind = str(item.kind);
      return {
        label,
        detail: quoted(
          text(item.name) ?? text(item.ref) ?? (kind ? humanize(kind) : undefined),
        ),
      };
    }
    case "cc_connect": {
      const link = Array.isArray(input.links)
        ? ((input.links[0] ?? {}) as Record<string, unknown>)
        : input;
      const from = quoted(text(link.from));
      const to = quoted(text(link.to));
      return { label, detail: from && to ? `${from} to ${to}` : from ?? to };
    }
    case "cc_node": {
      const action = Array.isArray(input.actions)
        ? ((input.actions[0] ?? {}) as Record<string, unknown>)
        : input;
      const verb = str(action.action);
      const subject = quoted(text(action.node));
      // Rename, add_to_group and route_network all have a second half worth
      // showing ("Set routing peer 'Office Router' to 'Office'").
      const target = quoted(
        text(action.name) ?? text(action.group) ?? text(action.network),
      );
      return {
        label: (verb && NODE_VERBS[verb]) ?? label,
        detail:
          subject && target && verb !== "move"
            ? `${subject} to ${target}`
            : subject,
      };
    }
    case "cc_policy":
      return { label, detail: quoted(text(input.node)) };
    case "cc_canvas": {
      const action = str(input.action);
      return { label: (action && CANVAS_VERBS[action]) ?? label };
    }
    default:
      return { label };
  }
}

/** The route the canvas lives on — pushed when a cc_ tool needs it open. */
export const CONTROL_CENTER_HREF = "/control-center";

export interface CcContext {
  redactor: Redactor;
  /** Pushes a dashboard route (the executor's `router.push`). */
  navigate: (href: string) => void;
  /** True when the control-center page is the current route. */
  onControlCenterPage: boolean;
}

export interface CcOutcome {
  content: string;
  isError: boolean;
}

/**
 * Resolve every placeholder the model sent back, at any depth — `cc_add`'s items
 * and `cc_connect`'s links are arrays of objects, so the executor's
 * top-level-strings-only pass isn't enough here.
 *
 * Two kinds of string arrive, and they resolve differently:
 *
 *  - A field that IS a placeholder is a REFERENCE (`ref`, `node`, `group`) and
 *    becomes the real id, which is what the canvas needs to look something up.
 *  - Anything else is PROSE that may mention one. A name or description is
 *    written by the model, which only ever saw tokens, so it writes them into the
 *    words: `"Colleagues to {PEER_1}"` reached the canvas verbatim and shipped as
 *    a policy called exactly that. Restored, it reads as the name the user sees.
 */
function resolveDeep(value: unknown, redactor: Redactor): unknown {
  if (typeof value === "string") {
    const reference = redactor.resolve(value);
    return reference ?? redactor.restore(value);
  }
  if (Array.isArray(value)) return value.map((v) => resolveDeep(v, redactor));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        resolveDeep(v, redactor),
      ]),
    );
  }
  return value;
}

/** The token for a canvas node: keyed by its id, displayed as its label. */
const nodeToken = (
  node: { nodeId: string; label: string },
  redactor: Redactor,
): string => redactor.handle("node", node.nodeId, node.label);

/**
 * Swap canvas ids for their tokens inside a result string. The bridge writes
 * peers into `detail` as bare node ids for exactly this reason; longest first,
 * so `peer-draft-x` never gets eaten by a shorter id that prefixes it.
 */
function tokeniseIds(
  detail: string,
  ids: Map<string, string>,
): string {
  let out = detail;
  for (const id of [...ids.keys()].sort((a, b) => b.length - a.length)) {
    if (out.includes(id)) out = out.split(id).join(ids.get(id)!);
  }
  return out;
}

/** Node → what the model sees. Personal labels are dropped, not tokenised twice. */
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
    // An admin-chosen label passes through as written; a peer's name doesn't
    // (its `entity` token is how the model refers to it).
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

function redactSnapshot(
  snapshot: AgentCanvasSnapshot,
  redactor: Redactor,
): Record<string, unknown> {
  /*
    Nodes first, deliberately: a token's DISPLAY value is set by whoever mints
    it, and only the nodes know the label. Mint the subject or an edge endpoint
    first and the same token would restore to a raw id in the answer.
  */
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
    ...(subject ? { subject: { kind: snapshot.subject!.kind, ref: subject } } : {}),
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

/** Canvas id → token, for every node currently on screen. */
function idTokens(
  snapshot: AgentCanvasSnapshot,
  redactor: Redactor,
): Map<string, string> {
  const ids = new Map<string, string>();
  snapshot.nodes.forEach((n) => ids.set(n.nodeId, nodeToken(n, redactor)));
  return ids;
}

/** Renders a batch's steps for the model, node ids tokenised. */
function reportSteps(
  steps: AgentStepResult[],
  api: CanvasAgentApi,
  redactor: Redactor,
): CcOutcome {
  const ids = idTokens(api.snapshot(), redactor);
  /*
    What the canvas did between the last report and this one — the debounced
    auto-arrange, mostly. Listed first because that's when it happened, and
    listed at all because it moves every node on screen: a trail that skips it
    makes the layout look like it changed on its own.
  */
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

const str = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

const single = (
  step: AgentStepResult,
  api: CanvasAgentApi,
  redactor: Redactor,
): CcOutcome => reportSteps([step], api, redactor);

/**
 * One action per call is the contract — each step gets its own activity row and
 * its own place in the transcript. A list is still accepted (and applied in
 * order) so a model that batches out of habit isn't punished for it.
 */
function actions<T>(input: Record<string, unknown>, listKey: string): T[] {
  const list = input[listKey];
  if (Array.isArray(list)) return list as T[];
  return [input as T];
}

/**
 * Execute one control-center tool. Returns the string handed back to the model,
 * always post-redaction.
 */
export async function executeControlCenterTool(
  name: CcTool,
  rawInput: unknown,
  { redactor, navigate, onControlCenterPage }: CcContext,
): Promise<CcOutcome> {
  const input = resolveDeep(
    (rawInput ?? {}) as Record<string, unknown>,
    redactor,
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

  switch (name) {
    case "cc_state":
      return {
        content: JSON.stringify(redactSnapshot(api.snapshot(), redactor)),
        isError: false,
      };

    case "cc_navigate": {
      const step = await api.navigate({
        view: String(input.view ?? "") as never,
        target: typeof input.target === "string" ? input.target : undefined,
      });
      return single(step, api, redactor);
    }

    case "cc_draft": {
      const step = await api.draft(String(input.action ?? "") as never);
      return single(step, api, redactor);
    }

    case "cc_add": {
      const items = actions<Record<string, unknown>>(input, "items");
      if (!items.some((i) => i.kind))
        return { content: "cc_add needs a `kind`.", isError: true };
      const steps = await api.add(
        items.map((i) => ({
          kind: String(i.kind ?? "") as never,
          ref: str(i.ref),
          role: str(i.role) as never,
          bidirectional:
            typeof i.bidirectional === "boolean" ? i.bidirectional : undefined,
          name: str(i.name),
          description: str(i.description),
          address: str(i.address),
          network: str(i.network),
          members: Array.isArray(i.members)
            ? i.members.filter((m): m is string => typeof m === "string" && !!m)
            : undefined,
        })),
        input.final === true,
      );
      return reportSteps(steps, api, redactor);
    }

    case "cc_connect": {
      const links = actions<Record<string, unknown>>(input, "links");
      if (!links.some((l) => l.from && l.to))
        return { content: "cc_connect needs `from` and `to`.", isError: true };
      const steps = await api.connect(
        links.map((l) => ({ from: String(l.from ?? ""), to: String(l.to ?? "") })),
        input.final === true,
      );
      return reportSteps(steps, api, redactor);
    }

    case "cc_node": {
      const list = actions<Record<string, unknown>>(input, "actions");
      if (!list.some((a) => a.node && a.action))
        return { content: "cc_node needs `node` and `action`.", isError: true };
      const steps = await api.node(
        list.map((a) => ({
          node: String(a.node ?? ""),
          action: String(a.action ?? "") as never,
          name: str(a.name),
          group: str(a.group),
          network: str(a.network),
          position:
            a.position && typeof a.position === "object"
              ? {
                  x: Number((a.position as { x?: unknown }).x ?? 0),
                  y: Number((a.position as { y?: unknown }).y ?? 0),
                }
              : undefined,
        })),
        input.final === true,
      );
      return reportSteps(steps, api, redactor);
    }

    case "cc_policy": {
      if (typeof input.node !== "string")
        return { content: "cc_policy needs the policy's `node`.", isError: true };
      const step = await api.policy({
        node: input.node,
        name: str(input.name),
        description: str(input.description),
        enabled: typeof input.enabled === "boolean" ? input.enabled : undefined,
        protocol: str(input.protocol) as never,
        ports: Array.isArray(input.ports)
          ? input.ports.map((p) => String(p))
          : undefined,
        bidirectional:
          typeof input.bidirectional === "boolean"
            ? input.bidirectional
            : undefined,
      }, input.final === true);
      return single(step, api, redactor);
    }

    case "cc_canvas": {
      const step = await api.canvas(String(input.action ?? "") as never);
      return single(step, api, redactor);
    }

    default:
      return {
        content: `Tool "${name}" is not available in this dashboard version.`,
        isError: true,
      };
  }
}
