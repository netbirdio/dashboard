/**
 * The contract the assistant drives the control-center canvas through.
 * Everything reachable here is draft-local or camera work:
 * nothing on this surface writes to the account, deploying stays a human click.
 */


export type AgentNodeKind =
  | "peer"
  | "group"
  | "policy"
  | "network"
  | "resource"
  | "resource-group"
  /** An Agent Network upstream (`providerNode`): OpenAI, a gateway, a local model. */
  | "provider"
  /** An Agent Network policy (`agentPolicyNode`): source groups → providers. */
  | "agent-policy"
  | "selector"
  | "other";

export type AgentPlaceholderKind = "user-device" | "server" | "agent";

export interface AgentNode {
  /** Canvas node id — the handle every action takes. */
  nodeId: string;
  kind: AgentNodeKind;
  /** The node's visible label (peer/group/policy/network/resource name). */
  label: string;
  /** The account entity behind the node, which lines it up with what other tools read. */
  entity?: {
    // `agent_policy` rather than `agent-policy`, because the kind is minted into tokens like `[AGENT_POLICY_3]`.
    kind:
      | "peer"
      | "group"
      | "policy"
      | "network"
      | "resource"
      | "provider"
      | "agent_policy";
    id: string;
  };
  /** Set on a peer card that is a not-yet-installed placeholder. */
  placeholder?: AgentPlaceholderKind;
  /** False for a node the user disabled on the canvas (dimmed). */
  enabled: boolean;
  /** Frame this node is a row of, if any. */
  parentNodeId?: string;
  /** True for a network frame (its resources are child rows). */
  frame?: boolean;
  /** Which of rename / remove / delete this node actually offers. */
  can: { rename: boolean; remove: boolean; delete: boolean };
}

export interface AgentCanvasSnapshot {
  mode: "live" | "draft";
  /** Which tab the canvas is on. */
  view: "peers" | "users" | "groups" | "networks";
  /** Node id of the network frame currently drilled into, if any. */
  drilledNetwork?: string;
  /** The entity the peer/user/group view is built around. */
  subject?: {
    kind: "peer" | "user" | "group" | "network";
    id: string;
    label: string;
  };
  nodes: AgentNode[];
  edges: { from: string; to: string }[];
  /** Draft changes recorded so far, as `type: name` pairs. */
  changes: { type: string; name: string }[];
  /** True while a blank draft is in progress (no start screen shown). */
  startedBlank: boolean;
}

export type AgentNavigateInput = {
  view: "peers" | "users" | "groups" | "networks" | "network";
  /**
   * Real id of the entity to build the view around: a peer, user or group id,
   * or — for `view: "network"` — the network to drill into. `"self"` picks the
   * signed-in user's own peer (peers view) or their user row (users view).
   */
  target?: string;
};

export type AgentDraftAction = "new_empty" | "from_current_view" | "exit";

export type AgentAddItem = {
  kind:
    | "server"
    | "agent"
    | "user_device"
    | "existing_peer"
    | "existing_group"
    | "new_group"
    | "new_policy"
    | "existing_policy"
    | "new_network"
    | "existing_network"
    | "new_resource"
    /** A `new_group` placed inside a network frame, as a row beside its resources. */
    | "new_resource_group"
    /*
      Agent Network.
      `new_provider` opens the Connect Provider modal for the person to fill in, since it takes the upstream's API key;
      the step resolves only when they save (ok) or cancel (failed).
      `new_agent_policy` is born empty and wired with `connect`:
      a group becomes a source, a provider a destination.
    */
    | "new_provider"
    | "existing_provider"
    | "new_agent_policy"
    | "existing_agent_policy";
  /** Real id of the entity to place, for the `existing_*` kinds. */
  ref?: string;
  /** Which end of the policy this node is, since the canvas cannot infer it before there are edges. */
  role?: "source" | "destination";
  /** Name for a placeholder peer, group, policy, network or resource. */
  name?: string;
  /** Description for a new policy, network or resource (groups have none). */
  description?: string;
  /** Direction of a `new_policy`; false makes it one-way at birth. */
  bidirectional?: boolean;
  /**
   * Protocol of a `new_policy`, set at birth
   * so the canvas never briefly shows a rule open to everything.
   */
  protocol?: "all" | "tcp" | "udp" | "icmp";
  /** Ports of a `new_policy`; tcp/udp only, ignored for anything else. */
  ports?: string[];
  /** Address of a new resource (IP, CIDR or domain); required for it. */
  address?: string;
  /** Node id of the network frame a new resource belongs to. */
  network?: string;
  /**
   * `new_group` only: the peers and resources the group starts with,
   * as canvas node ids or real ids of things not on the canvas.
   */
  members?: string[];
};

export type AgentLink = { from: string; to: string };

export type AgentNodeAction = {
  /**
   * The canvas node to act on.
   * `add_to_group` also accepts the real id of a peer or resource not on the canvas yet.
   */
  node: string;
  action:
    | "rename"
    | "remove"
    | "delete"
    | "enable"
    | "disable"
    | "focus"
    | "unfocus"
    | "move"
    | "add_to_group"
    | "route_network"
    | "details";
  /** New name, for `rename`. */
  name?: string;
  /** Canvas position, for `move`. */
  position?: { x: number; y: number };
  /** Target group's node id, for `add_to_group`. */
  group?: string;
  /**
   * Network frame's node id, for `route_network`: makes `node` (a peer, placeholder or group) its routing peer.
   * A router is a row on the frame's routing-peers bar, not a canvas node.
   */
  network?: string;
};

/** A draft policy edit; only the fields given change. */
export type AgentPolicyEdit = {
  /** The policy node to edit. */
  node: string;
  name?: string;
  description?: string;
  enabled?: boolean;
  protocol?: "all" | "tcp" | "udp" | "icmp";
  /** Ports or ranges, e.g. ["443", "8000-8080"]. TCP/UDP only. */
  ports?: string[];
  /**
   * False makes the policy one-way (source to destination).
   * Policies to a resource are always one-way: NetBird cannot initiate a connection from a subnet or domain.
   */
  bidirectional?: boolean;
};

export type AgentCanvasAction =
  | "zoom_in"
  | "zoom_out"
  | "fit_view"
  | "auto_arrange";

/**
 * One executed step.
 * `detail` is written for the model to quote back,
 * and refers to peers by canvas node id rather than by name.
 */
export interface AgentStepResult {
  ok: boolean;
  detail: string;
  /** The node the step created or acted on, when there is one. */
  nodeId?: string;
}

export interface CanvasAgentApi {
  getSnapshot: () => AgentCanvasSnapshot;
  /**
   * Things the canvas did on its own since the last call, such as a timed auto-arrange, as step lines.
   * Draining keeps each notice to exactly one report.
   */
  drainNotices: () => string[];
  goToView: (input: AgentNavigateInput) => Promise<AgentStepResult>;
  draftAction: (action: AgentDraftAction) => Promise<AgentStepResult>;
  /*
    `final` marks the last change of a build, so the canvas arranges once now instead of on the idle timer.
    A `new_provider` entry holds the whole call open until its modal is saved or cancelled.
  */
  addNodes: (
    items: AgentAddItem[],
    final?: boolean,
  ) => Promise<AgentStepResult[]>;
  connectNodes: (
    links: AgentLink[],
    final?: boolean,
  ) => Promise<AgentStepResult[]>;
  editNodes: (
    actions: AgentNodeAction[],
    final?: boolean,
  ) => Promise<AgentStepResult[]>;
  editPolicy: (
    edit: AgentPolicyEdit,
    final?: boolean,
  ) => Promise<AgentStepResult>;
  canvasAction: (action: AgentCanvasAction) => Promise<AgentStepResult>;
}

/*
  Whether the assistant is writing to the canvas right now.
  An external store rather than context,
  because the control-center page and the assistant's executor live in different React trees.
  `useAgentBusy` is the hook over it.
*/

let locked = false;
const activityListeners = new Set<() => void>();
/** Held briefly after the turn so a fast build doesn't flash the scrim off and on. */
export const ACTIVITY_LINGER_MS = 400;
let clearTimer: ReturnType<typeof setTimeout> | undefined;
let depth = 0;

/*
  The lock spans the whole turn once it has touched the canvas, not single steps,
  so the canvas is not handed back in the seconds between two steps.
*/
let turnActive = false;
/** The turn has touched the canvas; until then there is nothing to lock. */
let turnEngaged = false;
/** Longest a turn may hold the lock before it's released regardless. */
const TURN_MAX_MS = 3 * 60 * 1000;
let turnWatchdog: ReturnType<typeof setTimeout> | undefined;

const emitActivity = () => activityListeners.forEach((l) => l());

const setLocked = (next: boolean) => {
  if (locked === next) return;
  locked = next;
  emitActivity();
};

const scheduleClear = () => {
  clearTimer = setTimeout(() => setLocked(false), ACTIVITY_LINGER_MS);
};

/**
 * Holds the canvas for one assistant turn; call the returned release in the run's `finally`.
 * Locks nothing on its own, so a turn that never touches the canvas leaves the page alone.
 */
export function beginAgentTurn(): () => void {
  clearTimeout(clearTimer);
  clearTimeout(turnWatchdog);
  turnActive = true;
  turnEngaged = false;

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    clearTimeout(turnWatchdog);
    turnActive = false;
    turnEngaged = false;
    if (depth === 0) scheduleClear();
  };

  // A safety valve, so a missed release cannot leave the scrim up forever.
  turnWatchdog = setTimeout(release, TURN_MAX_MS);
  return release;
}

/** Locks the canvas for the length of one action. Nest-safe. */
export function beginAgentActivity(): () => void {
  clearTimeout(clearTimer);
  depth += 1;
  if (turnActive) turnEngaged = true;
  setLocked(true);

  let released = false;
  return () => {
    if (released) return;
    released = true;
    depth = Math.max(0, depth - 1);
    if (depth > 0) return;
    if (turnActive && turnEngaged) return;
    scheduleClear();
  };
}

export const agentActivityStore = {
  subscribe(listener: () => void): () => void {
    activityListeners.add(listener);
    return () => {
      activityListeners.delete(listener);
    };
  },
  getSnapshot: (): boolean => locked,
};

/*
  The bridge to the control-center canvas. The canvas lives in contexts inside
  the control-center page while the assistant panel is mounted above it, so
  neither can read the other through context; the page publishes its API here
  while it is mounted. When it is not, the executor navigates there first and
  waits for the registration.
*/
let current: CanvasAgentApi | null = null;
const waiters = new Set<(api: CanvasAgentApi) => void>();

/** Publish the canvas API. Called by CanvasAgentBridge while the page is up. */
export function registerCanvasAgent(api: CanvasAgentApi): () => void {
  current = api;
  waiters.forEach((resolve) => resolve(api));
  waiters.clear();
  return () => {
    if (current === api) current = null;
  };
}

export function getCanvasAgent(): CanvasAgentApi | null {
  return current;
}

/**
 * The canvas API once the control-center page is mounted, or null if it hasn't
 * appeared within `timeoutMs`, so the caller can tell the model instead of
 * hanging the turn.
 */
export function waitForCanvasAgent(timeoutMs = 8000): Promise<CanvasAgentApi | null> {
  if (current) return Promise.resolve(current);
  return new Promise((resolve) => {
    const done = (api: CanvasAgentApi | null) => {
      waiters.delete(onReady);
      clearTimeout(timer);
      resolve(api);
    };
    const onReady = (api: CanvasAgentApi) => done(api);
    const timer = setTimeout(() => done(current), timeoutMs);
    waiters.add(onReady);
  });
}
