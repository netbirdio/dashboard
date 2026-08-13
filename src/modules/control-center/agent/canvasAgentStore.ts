/**
 * The bridge the assistant drives the control-center canvas through.
 *
 * The canvas lives in React contexts *inside* the control-center page; the
 * assistant panel is mounted in DashboardLayout, above it — so neither can read
 * the other through context. A module-level registry can: the page mounts
 * `CanvasAgentBridge`, which publishes an imperative API for as long as the page
 * is on screen, and the assistant's tool executor picks it up from here.
 *
 * When the page isn't mounted there is nothing to drive, which is why
 * `waitForCanvasAgent` exists: the executor navigates to /control-center first
 * and awaits the registration that follows.
 *
 * Everything reachable here is DRAFT-LOCAL or camera work. Nothing on this
 * surface writes to the account — deploying stays a human click.
 */

import { useSyncExternalStore } from "react";

/** What a canvas node is, in the terms the assistant reasons about. */
export type AgentNodeKind =
  | "peer"
  | "group"
  | "policy"
  | "network"
  | "resource"
  | "resource-group"
  | "selector"
  | "other";

export type AgentPlaceholderKind = "user-device" | "server" | "agent";

export interface AgentNode {
  /** Canvas node id — the handle every action takes. */
  nodeId: string;
  kind: AgentNodeKind;
  /** The node's visible label (peer/group/policy/network/resource name). */
  label: string;
  /**
   * True when the label is a person or their machine (peer names, user
   * emails). The assistant only ever sees these as placeholders — group,
   * policy, network and resource names are admin-chosen labels and pass
   * through as written.
   */
  labelIsPersonal: boolean;
  /**
   * The account entity behind the node, when it has one. It's what lets the
   * assistant line a canvas node up with a peer or group it read about through
   * an ordinary tool call: the caller tokenises this with the SAME token that
   * resource already has (`{PEER_3}`).
   */
  entity?: {
    kind: "peer" | "group" | "policy" | "network" | "resource";
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
  /**
   * The entity the peer/user/group view is built around: real id plus the name
   * to display, so the caller's token restores to something readable.
   */
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

// ── action inputs ────────────────────────────────────────────────────────────

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
    /**
     * A group that lives INSIDE a network frame, as a row beside the resources
     * (the frame's own "Add Resource Group"). The same thing as `new_group` to
     * the API — what differs is where it sits: a group of one network's resources
     * belongs in that network, not floating next to it.
     */
    | "new_resource_group";
  /** Real id of the entity to place, for the `existing_*` kinds. */
  ref?: string;
  /**
   * Which end of the policy this node is — what decides where it lands. The
   * canvas reads left to right (sources → policy → destinations) and cannot
   * infer the role of a node that has no edges yet.
   */
  role?: "source" | "destination";
  /** Name for a placeholder peer, group, policy, network or resource. */
  name?: string;
  /**
   * Description for a new policy, network or resource — what it's for. Groups
   * have no description field in NetBird.
   */
  description?: string;
  /**
   * Direction of a `new_policy`: false makes it one-way at birth. Setting it
   * afterwards means the canvas briefly shows the other thing.
   */
  bidirectional?: boolean;
  /** Address of a new resource (IP, CIDR or domain) — required for it. */
  address?: string;
  /** Node id of the network frame a new resource belongs to. */
  network?: string;
  /**
   * `new_group` only: the peers and/or resources the group starts with — canvas
   * node ids, or the real id of something that was never drawn.
   *
   * A group is nearly always created FOR something ("the databases"), so naming
   * them here is one step instead of one per member, and the group is never drawn
   * empty. Applied through the same `addMemberToGroup` a drop uses.
   */
  members?: string[];
};

export type AgentLink = { from: string; to: string };

export type AgentNodeAction = {
  /**
   * The canvas node to act on. `add_to_group` also accepts a peer or resource
   * that isn't on the canvas yet (its real id) — the same thing dragging one
   * from the components panel onto a group does.
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
   * Network frame's node id, for `route_network` — makes `node` (a peer, incl. a
   * not-yet-installed placeholder, or a group) that network's routing peer.
   *
   * A router is NOT a canvas node: it's a row on the frame's routing-peers bar
   * and an entry in the changeset, which is why this is an action on the peer
   * rather than something to draw and then tidy away.
   */
  network?: string;
};

/**
 * A draft policy edit — the fields the policy editor exposes. Everything is
 * optional; only what's given changes.
 */
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
   * False makes the policy one-way (source → destination). Policies whose
   * destination is a resource are one-way whatever this says — NetBird can't
   * initiate a connection from a subnet or a domain.
   */
  bidirectional?: boolean;
};

export type AgentCanvasAction =
  | "zoom_in"
  | "zoom_out"
  | "fit_view"
  | "auto_arrange";

// ── results ──────────────────────────────────────────────────────────────────

/**
 * One executed step. `detail` is written for the model to quote back, so it
 * names what happened rather than which function ran — and refers to peers by
 * canvas node id (never by name), because the caller tokenises those ids before
 * the string leaves the browser.
 */
export interface AgentStepResult {
  ok: boolean;
  detail: string;
  /** The node the step created or acted on, when there is one. */
  nodeId?: string;
}

export interface CanvasAgentApi {
  snapshot: () => AgentCanvasSnapshot;
  /**
   * Things the canvas did on its own since the last call, as step lines.
   *
   * The auto-arrange runs on a timer AFTER the step that triggered it has
   * already reported, so it can't be part of that step's result — but it moves
   * everything on screen, and a trail that doesn't mention it reads as the canvas
   * rearranging itself for no reason. Draining (rather than reading) keeps each
   * notice to exactly one report.
   */
  drainNotices: () => string[];
  navigate: (input: AgentNavigateInput) => Promise<AgentStepResult>;
  draft: (action: AgentDraftAction) => Promise<AgentStepResult>;
  /*
    `final` says this is the last change of a build, so the canvas arranges once,
    here, instead of on the idle timer. The timer stays as the fallback for a
    caller that never says it's done — but it can't tell "still working" from
    "finished thinking", which is how a build ended up arranging twice.
  */
  add: (items: AgentAddItem[], final?: boolean) => Promise<AgentStepResult[]>;
  connect: (links: AgentLink[], final?: boolean) => Promise<AgentStepResult[]>;
  node: (
    actions: AgentNodeAction[],
    final?: boolean,
  ) => Promise<AgentStepResult[]>;
  policy: (edit: AgentPolicyEdit, final?: boolean) => Promise<AgentStepResult>;
  canvas: (action: AgentCanvasAction) => Promise<AgentStepResult>;
}

// ── activity (the canvas standing still while the assistant writes to it) ────

/**
 * Whether the assistant is writing to the canvas right now.
 *
 * A tiny external store rather than context: the control-center page and the
 * assistant's executor are in different trees (see the note at the top), and the
 * only consumer is one overlay — so this costs a single subscription instead of
 * a provider spanning the page.
 *
 * There is deliberately nothing to SAY here. The assistant panel is where the
 * user reads what is happening; the canvas' job is to hold still and stay out of
 * the way, so this carries one boolean and no label.
 */
export interface AgentActivity {
  locked: boolean;
}

let activity: AgentActivity = { locked: false };
const activityListeners = new Set<() => void>();
/** Held briefly after the turn so a fast build doesn't flash the scrim off and on. */
const ACTIVITY_LINGER_MS = 400;
let clearTimer: number | undefined;
let depth = 0;

/**
 * The assistant's turn, which spans many steps.
 *
 * A step lasts milliseconds; the model's round trip between two of them lasts
 * seconds — so scoping the lock to individual steps handed the canvas back in
 * every gap, mid-layout. The turn is the honest unit: once the assistant has
 * touched the canvas, it stays locked until the turn ends, whether that's an
 * answer, an error or the user's Cancel.
 */
let turnActive = false;
/** The turn has actually touched the canvas — until then there's nothing to lock. */
let turnEngaged = false;
/** Longest a turn may hold the lock before it's released regardless. */
const TURN_MAX_MS = 3 * 60 * 1000;
let turnWatchdog: number | undefined;

const emitActivity = () => activityListeners.forEach((l) => l());

const setLocked = (locked: boolean) => {
  if (activity.locked === locked) return;
  activity = { locked };
  emitActivity();
};

const scheduleClear = () => {
  clearTimer = window.setTimeout(() => setLocked(false), ACTIVITY_LINGER_MS);
};

/**
 * Holds the canvas for one assistant turn. Call at the start of the run and
 * release in its `finally`, so every exit — answered, errored, aborted — lets go.
 *
 * Locks nothing on its own: a turn that never touches the canvas (an ordinary
 * question) must leave the page the user is reading alone.
 */
export function beginAgentTurn(): () => void {
  window.clearTimeout(clearTimer);
  window.clearTimeout(turnWatchdog);
  turnActive = true;
  turnEngaged = false;

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    window.clearTimeout(turnWatchdog);
    turnActive = false;
    turnEngaged = false;
    if (depth === 0) scheduleClear();
  };

  // Safety valve: the release lives in the runtime's `finally`, and a scrim over
  // the whole module is the last thing that should outlive its owner.
  turnWatchdog = window.setTimeout(release, TURN_MAX_MS);
  return release;
}

/** Locks the canvas for the length of one action. Nest-safe. */
export function beginAgentActivity(): () => void {
  window.clearTimeout(clearTimer);
  depth += 1;
  if (turnActive) turnEngaged = true;
  setLocked(true);

  let released = false;
  return () => {
    if (released) return;
    released = true;
    depth = Math.max(0, depth - 1);
    if (depth > 0) return;
    // Mid-turn the lock stays; it's the same piece of work, still running.
    if (turnActive && turnEngaged) return;
    scheduleClear();
  };
}

export const agentActivityStore = {
  subscribe(listener: () => void) {
    activityListeners.add(listener);
    return () => activityListeners.delete(listener);
  },
  get: () => activity,
};

/**
 * Whether the assistant is WRITING to the canvas, for the parts of the module
 * that have to stand still while it is — the blocking overlay, and every keyboard
 * shortcut.
 *
 * A pointer scrim can't stop a `window` keydown listener, so undo, Auto Arrange
 * and Delete would still fire under it.
 */
export function useAgentBusy(): boolean {
  return useSyncExternalStore(
    agentActivityStore.subscribe,
    () => agentActivityStore.get().locked,
    () => false,
  );
}

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
 * appeared within `timeoutMs` (the caller then tells the model instead of
 * hanging the turn).
 */
export function waitForCanvasAgent(timeoutMs = 8000): Promise<CanvasAgentApi | null> {
  if (current) return Promise.resolve(current);
  return new Promise((resolve) => {
    const done = (api: CanvasAgentApi | null) => {
      waiters.delete(onReady);
      window.clearTimeout(timer);
      resolve(api);
    };
    const onReady = (api: CanvasAgentApi) => done(api);
    const timer = window.setTimeout(() => done(current), timeoutMs);
    waiters.add(onReady);
  });
}
