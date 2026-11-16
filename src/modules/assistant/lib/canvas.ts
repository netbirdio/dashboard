export type AgentNodeKind =
  | "peer"
  | "group"
  | "policy"
  | "network"
  | "resource"
  | "resource-group"
  | "provider"
  | "agent-policy"
  | "selector"
  | "other";

export type AgentPlaceholderKind = "user-device" | "server" | "agent";

export interface AgentNode {
  nodeId: string;
  kind: AgentNodeKind;
  label: string;
  entity?: {
    // `agent_policy`, not `agent-policy`: the kind is minted into tokens like `[AGENT_POLICY_3]`.
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
  placeholder?: AgentPlaceholderKind;
  enabled: boolean;
  parentNodeId?: string;
  frame?: boolean;
  can: { rename: boolean; remove: boolean; delete: boolean };
}

export interface AgentCanvasSnapshot {
  mode: "live" | "draft";
  view: "peers" | "users" | "groups" | "networks";
  drilledNetwork?: string;
  subject?: {
    kind: "peer" | "user" | "group" | "network";
    id: string;
    label: string;
  };
  nodes: AgentNode[];
  edges: { from: string; to: string }[];
  changes: { type: string; name: string }[];
  startedBlank: boolean;
}

export type AgentNavigateInput = {
  view: "peers" | "users" | "groups" | "networks" | "network";
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
    | "new_resource_group"
    | "new_provider"
    | "existing_provider"
    | "new_agent_policy"
    | "existing_agent_policy";
  ref?: string;
  role?: "source" | "destination";
  name?: string;
  description?: string;
  bidirectional?: boolean;
  protocol?: "all" | "tcp" | "udp" | "icmp";
  ports?: string[];
  address?: string;
  network?: string;
  members?: string[];
};

export type AgentLink = { from: string; to: string };

export type AgentNodeAction = {
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
  name?: string;
  position?: { x: number; y: number };
  group?: string;
  network?: string;
};

export type AgentPolicyEdit = {
  node: string;
  name?: string;
  description?: string;
  enabled?: boolean;
  protocol?: "all" | "tcp" | "udp" | "icmp";
  ports?: string[];
  bidirectional?: boolean;
};

export type AgentCanvasAction =
  | "zoom_in"
  | "zoom_out"
  | "fit_view"
  | "auto_arrange";

export interface AgentStepResult {
  ok: boolean;
  // Sent to the model: refers to peers by canvas node id, never by name.
  detail: string;
  nodeId?: string;
}

export interface CanvasAgentApi {
  getSnapshot: () => AgentCanvasSnapshot;
  drainNotices: () => string[];
  goToView: (input: AgentNavigateInput) => Promise<AgentStepResult>;
  draftAction: (action: AgentDraftAction) => Promise<AgentStepResult>;
  // `final` marks the last change of a build, so the canvas arranges now instead of on the idle timer.
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

let locked = false;
const activityListeners = new Set<() => void>();
export const ACTIVITY_LINGER_MS = 400;
let clearTimer: ReturnType<typeof setTimeout> | undefined;
let depth = 0;

let turnActive = false;
let turnEngaged = false;
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

  turnWatchdog = setTimeout(release, TURN_MAX_MS);
  return release;
}

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

let current: CanvasAgentApi | null = null;
const waiters = new Set<(api: CanvasAgentApi) => void>();

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
