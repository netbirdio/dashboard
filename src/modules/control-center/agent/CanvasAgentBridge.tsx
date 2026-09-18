"use client";

import {
  AgentAddItem,
  AgentCanvasAction,
  AgentCanvasSnapshot,
  AgentDraftAction,
  AgentLink,
  AgentNavigateInput,
  AgentNode,
  AgentNodeAction,
  AgentNodeKind,
  AgentPolicyEdit,
  AgentStepResult,
  beginAgentActivity,
  beginAgentTurn,
  CanvasAgentApi,
  registerCanvasAgent,
} from "@netbird/assistant-react";
import { Connection, Node, useReactFlow } from "@xyflow/react";
import { useEffect, useRef } from "react";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import {
  useCanvasState,
  useControlCenterUI,
  useDestinationGroup,
} from "@/modules/control-center/contexts/ControlCenterContext";
import { useControlCenterPolicy } from "@/modules/control-center/contexts/ControlCenterPolicyModals";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDiscardDraft } from "@/modules/control-center/draft/useDiscardDraft";
import { FlowView } from "@/modules/control-center/header/FlowSelector";
import { useAutoArrange } from "@/modules/control-center/hooks/useAutoArrange";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useDraftEntityDrop } from "@/modules/control-center/hooks/useDraftEntityDrop";
import {
  getNodeGroup,
  isGroupNode,
  useDraftGroupActions,
} from "@/modules/control-center/hooks/useDraftGroupActions";
import { useDraftNetworkActions } from "@/modules/control-center/hooks/useDraftNetworkActions";
import { useDraftNodeActions } from "@/modules/control-center/hooks/useDraftNodeActions";
import { useDraftNodeCreation } from "@/modules/control-center/hooks/useDraftNodeCreation";
import {
  groupContainsItem,
  useDragToGroup,
} from "@/modules/control-center/hooks/useDragToGroup";
import { useNodeRemoval } from "@/modules/control-center/hooks/useNodeRemoval";
import { getNodeRect } from "@/modules/control-center/utils/canvas-transition";
import {
  getDraftResource,
  getPlaceholderPeer,
  isDraftNetworkNode,
  isFrameNode,
  isPlaceholderPeer,
} from "@/modules/control-center/utils/helpers";
import { canRenamePeerNode } from "@/modules/control-center/utils/node-capabilities";
import {
  flashEdges,
  pulseNodes,
  spawnNodes,
} from "@/modules/control-center/utils/node-pulse";
import { NodeType } from "@/modules/control-center/utils/nodes";

/**
 * Publishes the canvas as an imperative API for the assistant, for as long as
 * the control-center page is mounted (see the SDK's canvas registry for why a
 * module-level registry and not a context).
 *
 * Every action routes through the same hooks the human UI uses — the components
 * panel's drops, the context menu's edits, the toolbar's camera, the canvas's
 * own connect handler — so an assistant-built draft is indistinguishable from a
 * hand-built one, changeset entries included.
 */
export const CanvasAgentBridge = ({
  onConnect,
}: {
  /** The canvas's own `onConnect` — the draft connect rules live behind it. */
  onConnect: (connection: Connection) => void;
}) => {
  const deps = useBridgeDeps(onConnect);

  /*
    The API object is registered ONCE — a fresh one per render would make the
    assistant's in-flight calls race the re-render — but its handlers must see
    the current canvas, so they read everything through this ref.

    Assigned during RENDER, not in an effect: a step that acts on what the
    previous step just created (name a group, connect a node) would otherwise
    run against hooks whose closures predate it, and write the changeset from
    stale state. Same pattern as the view refs on CanvasStateProvider.
  */
  const latest = useRef(deps);
  // eslint-disable-next-line react-hooks/refs
  latest.current = deps;

  // Built inside the effect so the API — and the registration — happen once,
  // no matter how often the canvas re-renders behind it.
  useEffect(() => {
    const api = buildApi(() => latest.current);
    // Test-only handle: e2e drives these actions directly, with no model in the
    // loop (same idea as __controlCenterDraftCanvas in CanvasStateProvider). `beginTurn` is
    // the runtime's turn latch, exposed so a test can check the overlay survives
    // the gaps between steps.
    if (process.env.APP_ENV === "test") {
      (
        window as unknown as {
          __controlCenterAgent?: CanvasAgentApi & { beginTurn: () => () => void };
        }
      ).__controlCenterAgent = { ...api, beginTurn: beginAgentTurn };
    }
    return registerCanvasAgent(api);
  }, []);

  return null;
};

function useBridgeDeps(onConnect: (connection: Connection) => void) {
  const reactFlow = useReactFlow();
  const canvas = useCanvasState();
  const ui = useControlCenterUI();
  const draft = useDraftMode();
  const { changes } = useDraftChangeset();
  const data = useControlCenterData();
  const {
    setFocusedNodeId,
    setSelectedDestinationGroup,
    setSelectedPeerPanel,
  } = useDestinationGroup();
  const { discardAndExit } = useDiscardDraft();
  const camera = useAutoArrange();
  const creation = useDraftNodeCreation();
  const drop = useDraftEntityDrop();
  const groupActions = useDraftGroupActions();
  const networkActions = useDraftNetworkActions();
  const nodeActions = useDraftNodeActions();
  const removal = useNodeRemoval();
  const { addMemberToGroup } = useDragToGroup();
  const { updateDraftPolicy } = useControlCenterPolicy();

  return {
    reactFlow,
    canvas,
    ui,
    draft,
    changes,
    data,
    onConnect,
    setFocusedNodeId,
    setSelectedDestinationGroup,
    setSelectedPeerPanel,
    discardAndExit,
    ...camera,
    ...creation,
    ...drop,
    ...groupActions,
    ...networkActions,
    ...nodeActions,
    ...removal,
    addMemberToGroup,
    updateDraftPolicy,
  };
}

type BridgeDeps = ReturnType<typeof useBridgeDeps>;
type Deps = () => BridgeDeps;

// ── pacing ───────────────────────────────────────────────────────────────────

/**
 * The assistant works at human speed on purpose: a step lands, the canvas
 * shows it, then the next one runs. Applied in one commit they would just blink
 * into their final state.
 */
const STEP_MS = 260;
/**
 * How long after the last structural step the canvas re-arranges.
 *
 * Deliberately longer than the gap between two tool calls (model round trip plus
 * streaming), so a whole build coalesces into ONE arrange after the last step
 * instead of one per connect. Watching the canvas re-lay itself out between
 * every step is worse than a slightly late tidy-up.
 */
const ARRANGE_IDLE_MS = 3500;

/*
  Where a new node lands.

  Everything used to drop at the origin, on top of whatever was already there.
  The canvas has a reading direction — sources on the left, policies in the
  middle, destinations on the right (see Views in CLAUDE.md) — so placement
  follows it: each kind has a lane, each lane stacks downward, and groups
  alternate sides because a policy usually has a group on each end. The
  debounced arrange still has the last word; this is about the minute the user
  spends watching it get built.
*/
/*
  The columns the draft layout itself uses (sources 0 → policies 500 →
  destinations 1000; see Views in CLAUDE.md). Placing a node straight into its
  column is the difference between "it appeared, then jumped" and "it appeared
  where it belongs" — the arrange that follows only has to tidy the spacing.
*/
const LANE_X = { left: 0, center: 500, right: 1000 } as const;
const LANE_PITCH = 170;
/** Slack around the columns when framing the build area. */
const BUILD_AREA_MARGIN = 260;
/** Enough vertical room for a few nodes per column before the camera re-fits. */
const BUILD_AREA_HEIGHT = 620;

type Lane = keyof typeof LANE_X;

/**
 * Per-draft placement state: where the lanes start, and how full each is. Keyed
 * by the draft session so it resets itself — the user may have opened the draft
 * from the UI, in which case no assistant call marked the beginning of it.
 */
let placement = {
  key: "",
  anchor: null as { x: number; y: number } | null,
  /** Whether the camera has already been set to cover the build area. */
  framed: false,
  left: 0,
  center: 0,
  right: 0,
};

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const nextFrame = () =>
  new Promise((r) => window.requestAnimationFrame(() => r(undefined)));
/**
 * Lets a just-created node reach the React Flow store before it's edited.
 * Two animation frames straddle at least one React commit; the trailing
 * macrotask lets any commit-scheduled effects run too. A bare zero-timeout
 * is not enough — under concurrent rendering it can fire pre-commit.
 */
const settle = async () => {
  await nextFrame();
  await nextFrame();
  await wait(0);
};

const ok = (detail: string, nodeId?: string): AgentStepResult => ({
  ok: true,
  detail,
  nodeId,
});
const fail = (detail: string): AgentStepResult => ({ ok: false, detail });

// ── the API ──────────────────────────────────────────────────────────────────

/**
 * Wraps one action so the canvas holds still while the assistant writes to it:
 * dimmed and not interactive. Every entry point goes through this — one that
 * forgot to would let the user drag a node out from under a layout mid-build.
 * What's happening is narrated in the assistant panel, not here.
 */
async function acting<T>(run: () => Promise<T>): Promise<T> {
  const done = beginAgentActivity();
  try {
    return await run();
  } finally {
    done();
  }
}

function buildApi(deps: Deps): CanvasAgentApi {
  const snapshot = (): AgentCanvasSnapshot => {
    const d = deps();
    const nodes = d.reactFlow.getNodes();

    /*
      The view's subject, with the NAME it should display: a token's display
      value is set by whoever mints it first, and an id-as-display leaks a raw
      id into the answer the moment the model mentions the subject.
    */
    const subject = (): AgentCanvasSnapshot["subject"] => {
      const named = (
        kind: NonNullable<AgentCanvasSnapshot["subject"]>["kind"],
        id: string,
        label?: string,
      ) => ({ kind, id, label: label ?? id });

      if (d.canvas.selectedNetwork) {
        const network = d.data.networks?.find(
          (n: Network) => n.id === d.canvas.selectedNetwork,
        );
        return named("network", d.canvas.selectedNetwork, network?.name);
      }
      if (d.canvas.currentView === FlowView.PEERS && d.canvas.selectedPeer) {
        const peer = d.data.peers?.find(
          (p: Peer) => p.id === d.canvas.selectedPeer,
        );
        return named("peer", d.canvas.selectedPeer, peer?.name);
      }
      if (d.canvas.currentView === FlowView.USERS && d.canvas.selectedUser) {
        const user = d.data.users?.find((u) => u.id === d.canvas.selectedUser);
        return named("user", d.canvas.selectedUser, user?.name || user?.email);
      }
      if (d.canvas.currentView === FlowView.GROUPS && d.canvas.selectedGroup) {
        const group = d.data.groups?.find(
          (g: Group) => g.id === d.canvas.selectedGroup,
        );
        return named("group", d.canvas.selectedGroup, group?.name);
      }
      return undefined;
    };

    return {
      mode: d.draft.isDraft ? "draft" : "live",
      view: d.canvas.currentView as AgentCanvasSnapshot["view"],
      drilledNetwork: d.draft.drillDownNetworkNodeId ?? undefined,
      subject: subject(),
      startedBlank: d.draft.startedBlank,
      nodes: nodes.filter((n) => !n.hidden).map((n) => describeNode(n, d)),
      edges: d.reactFlow.getEdges().map((e) => ({ from: e.source, to: e.target })),
      changes: d.changes.map((c) => ({
        type: c.type,
        name: "name" in c ? c.name : "",
      })),
    };
  };

  const navigate = async (
    input: AgentNavigateInput,
  ): Promise<AgentStepResult> => {
    let d = deps();
    const { view, target } = input;

    if (d.draft.isDraft) {
      // Leaving a drill-down is the one "view change" a draft really has.
      if (d.draft.drillDownNetworkNodeId && view === "networks") {
        d.draft.setDrillDownNetworkNodeId(null);
        return ok("Left the network, back to the full draft.");
      }

      // Entering a network means drilling into its frame — which only exists if
      // that frame is on the canvas.
      if (view === "network") {
        const network = resolveNetwork(target, d);
        if (!network?.id)
          return fail(`No network matches ${target ?? "(no target)"}.`);
        const frame = d.reactFlow
          .getNodes()
          .find(
            (n) =>
              isFrameNode(n) &&
              (n.data as { network?: { id?: string } })?.network?.id ===
                network.id,
          );
        if (frame) {
          d.draft.setDrillDownNetworkNodeId(frame.id);
          return ok(`Drilled into network “${network.name}”.`, frame.id);
        }
        if (!draftIsUntouched(d)) {
          return fail(
            `Network “${network.name}” isn't on this draft canvas — add it with control_center_add (existing_network) and drill in after.`,
          );
        }
      } else if (VIEWS[view] === d.canvas.currentView) {
        /*
          Asking for the view you're already on is a no-op, not a failure — this
          used to answer "leave draft mode first", which is both wrong and the
          worst possible advice: following it would discard the user's work.
        */
        return ok(
          `Already on the ${view} view. In a draft the canvas is what you've built, ` +
            `not a tab — bring anything else you need onto it with control_center_add ` +
            `(existing_peer, existing_group, existing_policy, existing_network).`,
        );
      } else if (!draftIsUntouched(d)) {
        return fail(
          "A draft is one canvas, not a set of tabs, and switching views would throw it away. " +
            "Add what you need to see instead — control_center_add with existing_peer / existing_group / " +
            "existing_policy / existing_network brings the real thing onto this canvas.",
        );
      }

      /*
        An empty draft with nothing recorded has nothing to lose, so navigating
        is free: drop it, go where asked, and say so. The caller can come back in
        with `from_current_view` around whatever it finds — which is usually what
        it wanted in the first place.
      */
      await d.discardAndExit();
      await wait(STEP_MS);
      d = deps();
      const landed = await navigateLive(view, target, d);
      return landed.ok
        ? ok(`${landed.detail} (Left the empty draft to get here.)`)
        : landed;
    }

    return navigateLive(view, target, d);
  };

  /** The live-mode half of navigate: pick the tab, then its subject. */
  const navigateLive = async (
    view: AgentNavigateInput["view"],
    target: string | undefined,
    d: BridgeDeps,
  ): Promise<AgentStepResult> => {
    if (view === "network") {
      const network = resolveNetwork(target, d);
      if (!network?.id)
        return fail(`No network matches ${target ?? "(no target)"}.`);
      const frame = d.reactFlow
        .getNodes()
        .find((n) => n.id === `network-${network.id}`);
      d.ui.onNetworkSelect(network.id, getNodeRect(frame));
      return ok(`Opened network “${network.name}”.`);
    }

    const resolved = resolveSubject(view, target, d);
    if (target && !resolved.id) return fail(resolved.detail);

    /*
      Two steps, the same two a human takes: switch the tab, then pick from its
      selector. The switch is what CREATES that selector node (with its own
      change handler), and the view-init effect patches the selection INTO it —
      so setting a selection while the node is missing would leave the canvas
      showing the old view's graph.
    */
    const selectorId = SELECTOR_NODES[view];
    const hasSelector = () =>
      !selectorId || d.reactFlow.getNodes().some((n) => n.id === selectorId);
    if (d.canvas.currentView !== VIEWS[view] || !hasSelector()) {
      d.ui.onViewChange(VIEWS[view]);
      if (!resolved.id) return ok(resolved.detail);
      // Bounded: an account with no peers/users never gets a selector, and the
      // empty state is the honest answer there.
      for (let i = 0; i < 40 && !hasSelector(); i++) await wait(50);
      if (!hasSelector()) return ok(`Opened the ${view} view (it's empty).`);
    }
    if (!resolved.id) return ok(resolved.detail);

    d.canvas.setSelectedDestinationGroup("");
    d.canvas.setSelectedNetwork("");
    if (view === "peers") d.canvas.setSelectedPeer(resolved.id);
    if (view === "users") d.canvas.setSelectedUser(resolved.id);
    if (view === "groups") d.canvas.setSelectedGroup(resolved.id);
    // Invalidating the layout is what makes the view rebuild around it.
    d.canvas.setLayoutInitialized(false);
    return ok(resolved.detail);
  };

  const draftAction = async (
    action: AgentDraftAction,
  ): Promise<AgentStepResult> => {
    const d = deps();
    if (action === "exit") {
      if (!d.draft.isDraft) return ok("Already in live mode.");
      const left = await d.discardAndExit();
      return left
        ? ok("Left draft mode; the draft was discarded.")
        : fail("The user chose to keep the draft — still in draft mode.");
    }
    /*
      Already drafting is the state the caller wanted, not an error — the user
      may have opened the draft themselves. Saying "done" keeps the assistant
      moving; treating it as a failure invited it to exit and start over, which
      would throw the user's work away.
    */
    if (d.draft.isDraft) {
      return ok("Already in a draft — kept it and its changes.");
    }
    if (action === "new_empty") {
      d.draft.startBlankDraft();
      await wait(STEP_MS);
      return ok("Started a new empty draft.");
    }
    // A draft from the current view copies what's on the canvas, so there has to
    // BE something on it: right after a navigation the live view is still
    // building, and starting too early would carry over an empty world.
    for (let i = 0; i < 40 && d.reactFlow.getNodes().length === 0; i++) {
      await wait(50);
    }
    d.draft.startCurrentDraft();
    await wait(STEP_MS);
    return ok("Started a draft from the current view.");
  };

  const add = async (
    items: AgentAddItem[],
    final = false,
  ): Promise<AgentStepResult[]> => {
    const results: AgentStepResult[] = [];
    for (const item of items) {
      const blocked = requireDraft(deps());
      if (blocked) {
        results.push(blocked);
        break;
      }
      const step = await addOne(item, deps());
      results.push(step);
      if (step.ok && step.nodeId) {
        const d = deps();
        spawnNodes(d.reactFlow, [step.nodeId]);
        pulseNodes(d.reactFlow, [step.nodeId]);
        await revealNode(step.nodeId, d);
      }
      await wait(STEP_MS);
    }
    // No arrange for an ordinary add: the node already sits in its column, and
    // re-laying the canvas out under the user is the jump this placement avoids.
    // A caller that says it's finished gets one, though — that's the point of it.
    if (final && results.some((r) => r.ok)) results.push(arrangeNow(deps));
    return results;
  };

  const connect = async (
    links: AgentLink[],
    final = false,
  ): Promise<AgentStepResult[]> => {
    const results: AgentStepResult[] = [];
    for (const link of links) {
      const d = deps();
      const blocked = requireDraft(d);
      if (blocked) {
        results.push(blocked);
        break;
      }
      const nodes = d.reactFlow.getNodes();
      const from = nodes.find((n) => n.id === link.from);
      const to = nodes.find((n) => n.id === link.to);
      if (!from || !to) {
        results.push(
          fail(
            `Nothing on the canvas with id ${
              from ? link.to : link.from
            } — connect skipped.`,
          ),
        );
        continue;
      }
      const edgesBefore = new Set(d.reactFlow.getEdges().map((e) => e.id));
      d.onConnect({
        source: from.id,
        target: to.id,
        // The draft connect rules read the side off the handle the drag started
        // from, so a programmatic connect has to name one (see draft-connect):
        // the right handle means "source side", the left one "destination".
        sourceHandle: startHandle(from, to),
        targetHandle: null,
      });
      results.push(
        ok(`Connected ${refOf(from)} → ${refOf(to)}.${dialogNote(from, to)}`),
      );
      // The edge is created inside onConnect's own state update, so it only
      // exists once that has committed — hence the settle before the flash.
      await settle();
      const fresh = d.reactFlow
        .getEdges()
        .filter((e) => !edgesBefore.has(e.id))
        .map((e) => e.id);
      flashEdges(d.reactFlow, fresh);
      pulseNodes(d.reactFlow, [from.id, to.id]);
      await wait(STEP_MS);
    }
    if (results.some((r) => r.ok)) {
      if (final) results.push(arrangeNow(deps));
      else scheduleArrange(deps);
    }
    return results;
  };

  const node = async (
    actions: AgentNodeAction[],
    final = false,
  ): Promise<AgentStepResult[]> => {
    const results: AgentStepResult[] = [];
    let movedThings = false;
    for (const action of actions) {
      const result = await nodeOne(action, deps());
      results.push(result);
      if (result.ok) {
        const d = deps();
        // The node itself is gone after a remove/delete — ring the group that
        // absorbed it, or nothing at all.
        const highlight =
          action.action === "add_to_group" ? action.group : action.node;
        if (highlight && d.reactFlow.getNodes().some((n) => n.id === highlight)) {
          pulseNodes(d.reactFlow, [highlight]);
          await revealNode(highlight, d);
        }
      }
      if (result.ok && LAYOUT_ACTIONS.has(action.action)) movedThings = true;
      await wait(STEP_MS);
    }
    // Removing or absorbing nodes leaves holes in the layout; renaming and
    // focusing don't, and an explicit `move` shouldn't be undone by arranging.
    if (final && results.some((r) => r.ok)) results.push(arrangeNow(deps));
    else if (movedThings) scheduleArrange(deps);
    return results;
  };

  const policy = async (
    edit: AgentPolicyEdit,
    final = false,
  ): Promise<AgentStepResult> => {
    /*
      Settle BEFORE reading the canvas, and re-read `deps()` afterwards.

      `editPolicy` is a read-modify-write on `node.data.policy`, and so is every
      `connect` — each takes the whole policy, changes one part and writes it
      back. A batch normally arrives as add, connect, connect, policy in one
      message, so without a flush in between this read sees the policy as it was
      before the connects landed. The write that lands last then wins, and the
      symptom is a draft with its sources and destinations intact and its
      protocol and ports quietly back at "all" — the assistant having truthfully
      called the tool and the canvas having dropped the result.

      The `add` path already polls with `settle()` for the same reason. This one
      did not, which is the whole bug.
    */
    await settle();
    const d = deps();
    const blocked = requireDraft(d);
    if (blocked) return blocked;
    const result = editPolicy(edit, d);
    if (result.ok && result.nodeId) {
      pulseNodes(d.reactFlow, [result.nodeId]);
      await revealNode(result.nodeId, d);
    }
    if (final && result.ok) arrangeNow(deps);
    return result;
  };

  const canvasAction = async (
    action: AgentCanvasAction,
  ): Promise<AgentStepResult> => {
    const d = deps();
    switch (action) {
      case "zoom_in":
        d.zoomIn();
        return ok("Zoomed in.");
      case "zoom_out":
        d.zoomOut();
        return ok("Zoomed out.");
      case "fit_view":
        void d.fitView();
        return ok("Fitted the canvas into view.");
      case "auto_arrange":
        d.arrange();
        return ok("Auto-arranged the canvas and fitted the view.");
      default:
        return fail(`Unknown canvas action “${action}”.`);
    }
  };

  /*
    The public surface. Everything except `getSnapshot` (a pure read) runs
    inside `acting`, so the pane is dimmed and locked for exactly as long as
    the step takes — the user can still reach the header, toolbar and Cancel.
  */
  return {
    getSnapshot: snapshot,
    drainNotices: () => notices.splice(0, notices.length),
    goToView: (input) => acting(() => navigate(input)),
    draftAction: (action) => acting(() => draftAction(action)),
    addNodes: (items, final) => acting(() => add(items, final)),
    connectNodes: (links, final) => acting(() => connect(links, final)),
    editNodes: (actions, final) => acting(() => node(actions, final)),
    editPolicy: (edit, final) => acting(() => policy(edit, final)),
    canvasAction: (action) => acting(() => canvasAction(action)),
  };
}
const VIEWS: Record<string, FlowView> = {
  peers: FlowView.PEERS,
  users: FlowView.USERS,
  groups: FlowView.GROUPS,
  networks: FlowView.NETWORKS,
};

/** The "pick a peer/user/group" node each live view builds around. */
const SELECTOR_NODES: Record<string, string | undefined> = {
  peers: "select-peer-node",
  users: "select-user-node",
  groups: "select-group-node",
  networks: undefined,
};

/** Node actions after which the canvas wants re-arranging. */
const LAYOUT_ACTIONS = new Set(["remove", "delete", "add_to_group"]);

/** A draft with nothing on it and nothing recorded — safe to walk away from. */
const draftIsUntouched = (d: BridgeDeps): boolean =>
  d.reactFlow.getNodes().length === 0 && d.changes.length === 0;

const requireDraft = (d: BridgeDeps): AgentStepResult | null =>
  d.draft.isDraft
    ? null
    : fail("Only possible in draft mode — start a draft first.");

/**
 * Arrange once the steps stop coming. Every call restarts the timer, so ten
 * individual adds cost one re-layout instead of ten.
 *
 * It shows itself twice over: the busy pill names it while it runs, and it leaves
 * a notice for the next report so the assistant's step trail accounts for the
 * movement it caused (see drainNotices).
 */
let arrangeTimer: number | undefined;
const notices: string[] = [];

/**
 * Arrange right now, as part of the step that asked for it. Cancels any pending
 * idle arrange so the canvas doesn't settle twice.
 */
function arrangeNow(deps: Deps): AgentStepResult {
  window.clearTimeout(arrangeTimer);
  arrangeTimer = undefined;
  deps().arrange();
  return ok("Arranged the canvas and fitted the view.");
}

function scheduleArrange(deps: Deps) {
  window.clearTimeout(arrangeTimer);
  arrangeTimer = window.setTimeout(() => {
    arrangeTimer = undefined;
    const done = beginAgentActivity();
    try {
      deps().arrange();
      notices.push("Auto-arranged the canvas and fitted the view.");
    } finally {
      // The arrange itself is synchronous; the animation that follows is the
      // canvas's business, not a reason to keep the pane locked.
      done();
    }
  }, ARRANGE_IDLE_MS);
}

// ── adding ───────────────────────────────────────────────────────────────────

async function addOne(
  item: AgentAddItem,
  d: BridgeDeps,
): Promise<AgentStepResult> {
  const { kind, ref, name } = item;
  // Its spot in the reading order, claimed before anything is created — and on
  // the first one, the camera is set to cover the whole area first.
  const at = nextPlacement(kind, item.role, d);
  frameBuildArea(d);

  switch (kind) {
    case "server":
    case "agent":
    case "user_device": {
      const nodeId = d.addPeerPlaceholder(
        kind === "user_device" ? "user-device" : kind,
        at,
        name,
      );
      return ok(
        `Added a ${kind.replace("_", " ")} placeholder${
          name ? ` named “${name}”` : ""
        } — it has to be installed before the draft can deploy.`,
        nodeId,
      );
    }

    case "existing_peer": {
      const peer = d.data.peers?.find((p) => p.id === ref);
      if (!peer) return fail(`No peer matches ${ref ?? "(no ref)"}.`);
      if (onCanvas(`peer-${peer.id}`, d))
        return fail("That peer is already on the canvas.");
      return ok("Added the existing peer.", d.dropExistingPeer(peer, at));
    }

    case "existing_group": {
      const group = d.data.groups?.find((g) => g.id === ref);
      if (!group) return fail(`No group matches ${ref ?? "(no ref)"}.`);
      if (onCanvas(`group-${group.id}`, d))
        return fail(`Group “${group.name}” is already on the canvas.`);
      const nodeId = d.dropExistingGroup(group, at);
      // `members` works here too: "put the databases in the group they already
      // have" is the same intent as creating one for them.
      const joined =
        nodeId && item.members?.length
          ? await fillGroup(nodeId, item.members, d)
          : 0;
      return ok(
        `Added the existing group “${group.name}”${
          item.members?.length
            ? ` and put ${joined} of ${item.members.length} in it`
            : ""
        }.`,
        nodeId,
      );
    }

    /*
      A group INSIDE a network frame — the frame's own "Add Resource Group". Same
      group as far as the API is concerned; the difference is that a group of one
      network's resources reads as part of that network instead of floating beside
      it. Named after creation because the frame's creator picks the unique name
      itself (like the context menu does), then rename applies the caller's.
    */
    case "new_resource_group": {
      const frame = d.reactFlow
        .getNodes()
        .find((n) => n.id === item.network && isFrameNode(n));
      if (!frame)
        return fail(
          `${item.network ?? "(no network)"} isn't a network frame — a resource group needs the network it belongs to.`,
        );
      const before = new Set(d.reactFlow.getNodes().map((n) => n.id));
      d.addResourceGroupToFrame(frame.id);
      await settle();
      const created = d.reactFlow.getNodes().find((n) => !before.has(n.id));
      if (!created) return fail("Could not add the resource group.");
      if (name) {
        const taken = groupNameTaken(name, d, created.id);
        if (taken) return fail(taken);
        d.renameGroup(created, name);
        await settle();
      }
      const joined = item.members?.length
        ? await fillGroup(created.id, item.members, d)
        : 0;
      const network = (frame.data as { network?: Network })?.network;
      return ok(
        `Added the group${name ? ` “${name}”` : ""} inside “${
          network?.name ?? "the network"
        }”${
          item.members?.length
            ? ` with ${joined} of ${item.members.length} of its resources`
            : ""
        }.`,
        created.id,
      );
    }

    case "new_group": {
      const taken = name ? groupNameTaken(name, d) : null;
      if (taken) return fail(taken);
      // placeNode centres a card on its drop point; addNewGroup takes the
      // top-left, so mirror the offset the components panel applies. The name
      // goes in HERE — see addNewGroup on why not afterwards.
      const nodeId = d.addNewGroup({ x: at.x - 100, y: at.y - 30 }, name);
      if (!nodeId) return fail("Could not add the group.");

      const added = item.members?.length
        ? await fillGroup(nodeId, item.members, d)
        : 0;
      return ok(
        `Added a new group${name ? ` “${name}”` : ""}${
          item.members?.length
            ? ` with ${added} of ${item.members.length} member${
                item.members.length === 1 ? "" : "s"
              }`
            : ""
        }.`,
        nodeId,
      );
    }

    case "new_policy": {
      const before = new Set(d.reactFlow.getNodes().map((n) => n.id));
      d.addBlankPolicy(at, {
        name,
        description: item.description,
        bidirectional: item.bidirectional,
        protocol: item.protocol,
        ports: item.ports,
      });
      // The node lands in reactFlow only after React commits; one settle tick
      // is not guaranteed to run after that, so poll briefly for it.
      let created: Node | undefined;
      for (let i = 0; i < 20 && !created; i++) {
        await settle();
        created = d.reactFlow.getNodes().find((n) => !before.has(n.id));
        if (!created) await wait(25);
      }
      /*
        The rule's current state is stated here, not left implied.

        A policy the caller did not narrow starts at all protocols and all
        ports, and the guidance to narrow it lives in a skill the model may
        have read many turns ago. That produced the failure worth designing
        against: a draft left wide open while the message above it described a
        narrow rule the model had only intended. A tool result is read in the
        moment, so saying what the rule actually holds makes the gap between
        the draft and the claim much harder to miss.
      */
      const narrowed = item.protocol && item.protocol !== "all";
      const holds = narrowed
        ? `${item.protocol}${
            item.ports?.length ? ` on ${item.ports.join(", ")}` : ", all ports"
          }`
        : "ALL protocols on ALL ports";
      return ok(
        `Added a${narrowed ? "" : "n empty"} ${
          item.bidirectional === false ? "one-way " : ""
        }policy${name ? ` “${name}”` : ""}. It allows ${holds}${
          narrowed
            ? ""
            : " — call control_center_policy to narrow it before you describe it to the user"
        }. Connect a source and a destination to it: a policy with only one side never deploys.`,
        created?.id,
      );
    }

    case "existing_policy": {
      const policy = d.data.policies?.find((p: Policy) => p.id === ref);
      if (!policy) return fail(`No policy matches ${ref ?? "(no ref)"}.`);
      d.dropExistingPolicy(policy, at);
      return ok(
        `Added the policy “${policy.name}” together with its sources and destinations.`,
      );
    }

    case "new_network": {
      const nodeId = d.addDraftNetwork(
        at,
        name ? { name, description: item.description } : undefined,
      );
      return ok(`Added a new network${name ? ` “${name}”` : ""}.`, nodeId);
    }

    case "existing_network": {
      const network = d.data.networks?.find((n: Network) => n.id === ref);
      if (!network) return fail(`No network matches ${ref ?? "(no ref)"}.`);
      if (onCanvas(`network-${network.id}`, d))
        return fail(`Network “${network.name}” is already on the canvas.`);
      return ok(
        `Added the existing network “${network.name}” as a frame with its resources.`,
        d.dropExistingNetwork(network, at),
      );
    }

    case "new_resource": {
      // A resource IS its address — the canvas cannot draw one without it. The
      // reply steers the model toward assuming one over asking: the user can
      // edit the address on the node, and nothing deploys without their click.
      if (!item.address) {
        return fail(
          "A resource needs an address (IP, CIDR or domain) — nothing was added. Add it again with a plausible address (inside the network's range if known) and tell the user what you assumed; they can correct it on the node.",
        );
      }
      const frame = item.network
        ? d.reactFlow
            .getNodes()
            .find((n) => n.id === item.network && isFrameNode(n))
        : undefined;
      if (item.network && !frame)
        return fail(`No network frame matches ${item.network}.`);
      const nodeId = frame
        ? d.addResourceToFrame(frame.id)
        : d.addDraftResource(at, {
            name,
            address: item.address,
            description: item.description,
          });
      if (!nodeId) return fail("Could not add the resource.");
      // The node is born in this commit — stamp its data once it's committed,
      // exactly like the resource editor's own save does.
      await settle();
      const network = frame ? frameRef(frame) : { name: "" };
      d.saveDraftResource({
        nodeId,
        name: name ?? "Resource",
        address: item.address,
        description: item.description,
        groupIds: [],
        network,
      });
      // The address stays OUT of the detail: an IP or CIDR in a tool result
      // trips the assistant server's PII backstop, which is non-reversible —
      // the model would echo a literal "[redacted-ip]" back at the user. The
      // node id is the honest reference, and the model already knows the
      // address it asked for.
      return ok(
        `Added the resource${
          frame ? ` to “${network.name}”` : " — it still needs a network"
        }.`,
        nodeId,
      );
    }

    default:
      return fail(`Unknown kind “${kind}”.`);
  }
}

/**
 * Puts a new group's initial members in it, and returns how many landed.
 *
 * Same writer as a drop and as `control_center_node` `add_to_group` (`addMemberToGroup`), so
 * the changeset can't tell the difference — this only saves the round trips. It
 * exists because a group is nearly always created FOR something: "the databases",
 * "the printers". Naming those in the same call is one step the user watches
 * instead of four, and it stops a policy being drawn at an empty group.
 *
 * A member may be a canvas node id or the real id of a peer/resource that was
 * never drawn (what the components panel's drag does). Unknown ids are skipped
 * rather than failing the group — the group is the thing the caller asked for, and
 * the count in the reply says what actually happened.
 */
/**
 * The peer or resource a member reference points at, with the id membership is
 * keyed on.
 *
 * `id` may be a canvas node id or the real id of something never drawn. The
 * draft-resource case is why this is a function: such a node's `data.resource` is
 * a PARTIAL with no id (the id is synthesized from the node id by
 * getDraftResource), and `addMemberToGroup` silently drops a member with no
 * itemId — so reading the raw field made grouping a freshly drawn resource a
 * no-op that still reported success.
 */
function resolveMember(
  id: string,
  d: BridgeDeps,
): {
  peer?: Peer;
  resource?: NetworkResource;
  /** What membership is keyed on — absent means nothing resolved. */
  itemId?: string;
  /** The card to absorb, when the member is on the canvas. */
  nodeId?: string;
} {
  const node = d.reactFlow
    .getNodes()
    .find(
      (n) =>
        n.id === id ||
        (n.data as { peer?: Peer })?.peer?.id === id ||
        getDraftResource(n)?.id === id ||
        (n.data as { resource?: NetworkResource })?.resource?.id === id,
    );
  const peer =
    (node?.data as { peer?: Peer })?.peer ??
    getPlaceholderPeer(node) ??
    d.data.peers?.find((p: Peer) => p.id === id);
  const resource = peer
    ? undefined
    : getDraftResource(node) ??
      (node?.data as { resource?: NetworkResource })?.resource ??
      d.data.networkResources?.find((r: NetworkResource) => r.id === id);
  return {
    peer,
    resource,
    itemId: peer?.id ?? resource?.id,
    nodeId: node?.id,
  };
}

async function fillGroup(
  groupNodeId: string,
  members: string[],
  d: BridgeDeps,
): Promise<number> {
  // The group node is created in the commit before this one; commits land
  // asynchronously, so poll briefly instead of trusting a single tick.
  let group: Node | undefined;
  for (let i = 0; i < 20 && !group; i++) {
    await settle();
    group = d.reactFlow.getNodes().find((n) => n.id === groupNodeId);
    if (!group) await wait(25);
  }
  if (!group) return 0;

  let added = 0;
  for (const member of members) {
    const { peer, resource, itemId, nodeId } = resolveMember(member, d);
    if (!itemId) continue;

    // draggedNodeId is the card to absorb; addMemberToGroup keeps a framed
    // resource's row where it is (its network needs to still show it).
    d.addMemberToGroup(group, { peer, resource, itemId, draggedNodeId: nodeId });
    // Counted from the canvas, not from having called it: every early return in
    // addMemberToGroup (already a member, the system "All" group) is silent, and
    // a step reporting "2 of 2" when nothing joined is worse than one that admits
    // it did nothing.
    for (let i = 0; i < 20; i++) {
      await settle();
      const after = d.reactFlow.getNodes().find((n) => n.id === groupNodeId);
      if (after && groupContainsItem(after, itemId)) {
        added += 1;
        break;
      }
      await wait(25);
    }
  }
  return added;
}

// ── per-node actions ─────────────────────────────────────────────────────────

async function nodeOne(
  action: AgentNodeAction,
  d: BridgeDeps,
): Promise<AgentStepResult> {
  const target = d.reactFlow.getNodes().find((n) => n.id === action.node);

  /*
    Group membership is the one action whose subject needn't be on the canvas:
    the group panel has a drop zone for exactly this, so a peer or resource that
    was never drawn can still join a group. Falls through to the node path when
    the id IS a canvas node (its card then flies into the group).
  */
  if (!target && action.action === "add_to_group") {
    if (!d.draft.isDraft) return fail(GROUPS_NEED_DRAFT);
    return assignEntityToGroup(action, d);
  }

  if (!target) return fail(`Nothing on the canvas with id ${action.node}.`);

  const draftOnly = (): AgentStepResult | null =>
    d.draft.isDraft
      ? null
      : fail(
          `“${action.action}” only works in a draft — the live canvas mirrors the account.`,
        );

  switch (action.action) {
    case "focus":
      d.setSelectedDestinationGroup("");
      d.setFocusedNodeId(target.id);
      return ok(`Focused ${refOf(target)}.`);

    case "unfocus":
      d.setFocusedNodeId("");
      return ok("Cleared the focus.");

    case "details": {
      if (isGroupNode(target)) {
        const group = getNodeGroup(target);
        d.setSelectedPeerPanel("");
        d.setSelectedDestinationGroup(group?.id || target.id);
        return ok(`Opened the details panel for “${group?.name}”.`);
      }
      const peer =
        (target.data as { peer?: Peer })?.peer ?? getPlaceholderPeer(target);
      if (peer?.id) {
        d.setSelectedDestinationGroup("");
        d.setSelectedPeerPanel(peer.id);
        return ok(`Opened the groups panel for ${refOf(target)}.`);
      }
      return fail("That node has no details panel.");
    }

    case "move": {
      const blocked = draftOnly();
      if (blocked) return blocked;
      if (!action.position) return fail("Move needs a position.");
      const position = action.position;
      d.reactFlow.setNodes((prev) =>
        prev.map((n) => (n.id === target.id ? { ...n, position } : n)),
      );
      return ok(`Moved ${refOf(target)}.`);
    }

    case "rename": {
      const blocked = draftOnly();
      if (blocked) return blocked;
      const name = action.name?.trim();
      if (!name) return fail("Rename needs a name.");
      return rename(target, name, d);
    }

    case "enable":
    case "disable": {
      const blocked = draftOnly();
      if (blocked) return blocked;
      if (target.type !== NodeType.ResourceNode) {
        return fail(
          "Only resources can be enabled or disabled from here — a policy is toggled in its editor.",
        );
      }
      d.setResourceEnabled(target.id, action.action === "enable");
      return ok(
        `${action.action === "enable" ? "Enabled" : "Disabled"} ${refOf(
          target,
        )}.`,
      );
    }

    case "remove": {
      const blocked = draftOnly();
      if (blocked) return blocked;
      if (!d.canRemoveNode(target)) {
        return fail(
          `${refOf(
            target,
          )} can't be taken off the canvas — an existing resource inside a network can only be deleted.`,
        );
      }
      d.removeNode(target);
      return ok(
        `Removed ${refOf(target)} from the canvas — nothing was deleted.`,
      );
    }

    case "delete": {
      const blocked = draftOnly();
      if (blocked) return blocked;
      return deleteInDraft(target, d);
    }

    case "add_to_group": {
      const blocked = draftOnly();
      if (blocked) return blocked;
      const group = d.reactFlow.getNodes().find((n) => n.id === action.group);
      if (!group || !isGroupNode(group))
        return fail(`${action.group ?? "(no group)"} isn't a group node.`);
      const { peer, resource, itemId } = resolveMember(target.id, d);
      if (!itemId)
        return fail("Only peers and resources can join a group.");
      d.addMemberToGroup(group, {
        peer,
        resource,
        itemId,
        draggedNodeId: target.id,
      });
      // Membership lands in reactFlow only after React commits; one settle
      // tick is not guaranteed to run after that, so poll briefly for it.
      let filled: Node | undefined;
      for (let i = 0; i < 20; i++) {
        await settle();
        filled = d.reactFlow.getNodes().find((n) => n.id === group.id);
        if (filled && groupContainsItem(filled, itemId)) break;
        await wait(25);
      }
      if (!filled || !groupContainsItem(filled, itemId))
        return fail(
          `${refOf(target)} did not join “${getNodeGroup(group)?.name}” — it may already be in it.`,
        );
      return ok(
        `Added ${refOf(target)} to “${
          getNodeGroup(group)?.name
        }” — its own card is now part of the group.`,
      );
    }

    /*
      Routing peer for a network. Goes through the same writer as the
      routing-peer modal's save, so the changeset entry is identical to a hand
      pick — including a placeholder peer, whose router carries a blocking
      "Install" issue until the peer exists.

      Nothing is drawn: a router lives on the frame's routing-peers bar, not on
      the canvas, so there is no node to place and none to tidy away afterwards.
    */
    case "route_network": {
      const blocked = draftOnly();
      if (blocked) return blocked;
      const frame = d.reactFlow
        .getNodes()
        .find((n) => n.id === action.network && isFrameNode(n));
      if (!frame)
        return fail(`${action.network ?? "(no network)"} isn't a network frame.`);

      const group = isGroupNode(target) ? getNodeGroup(target) : undefined;
      const peer = group
        ? undefined
        : (target.data as { peer?: Peer })?.peer ?? getPlaceholderPeer(target);
      if (!peer && !group)
        return fail("Only a peer or a group can route a network.");

      d.addRouterFromSelection({
        networkNodeId: frame.id,
        peer,
        peerGroups: group ? [group] : [],
        metric: 9999,
        masquerade: true,
        enabled: true,
      });
      const network = (frame.data as { network?: Network })?.network;
      const pending = peer && isPlaceholderPeer(peer);
      return ok(
        `${refOf(target)} now routes “${network?.name ?? "the network"}”${
          pending ? " — it still has to be installed before this deploys" : ""
        }.`,
      );
    }

    default:
      return fail(`Unknown node action “${action.action}”.`);
  }
}

function rename(target: Node, name: string, d: BridgeDeps): AgentStepResult {
  if (isGroupNode(target)) {
    const group = getNodeGroup(target);
    // Group names must stay unique: a collision only surfaces at deploy, as
    // "group already exists", long after the rename looked like it worked.
    const taken = groupNameTaken(name, d, target.id);
    if (taken) return fail(taken);
    d.renameGroup(target, name);
    return ok(`Renamed group “${group?.name}” to “${name}”.`);
  }
  if ((target.data as { placeholderKind?: string })?.placeholderKind) {
    d.renamePlaceholder(target.id, name);
    return ok(`Renamed the placeholder to “${name}”.`);
  }
  if (target.id.startsWith("resource-new-")) {
    d.renameResource(target.id, name);
    return ok(`Renamed the resource to “${name}”.`);
  }
  if (isDraftNetworkNode(target)) {
    d.renameDraftNetwork(target, name);
    return ok(`Renamed the network to “${name}”.`);
  }
  if (canRenamePeerNode(target)) {
    return fail(
      "Renaming an installed peer changes the account, so it isn't a draft action — the user can do it from the peer's own menu.",
    );
  }
  return fail(
    `${refOf(
      target,
    )} can't be renamed in a draft — only draft groups, placeholders, draft resources and draft networks can.`,
  );
}

/**
 * Delete = mark for deletion, applied when the draft deploys. Nothing leaves
 * the account here, which is why — unlike the context menu — this doesn't stop
 * to confirm.
 */
function deleteInDraft(target: Node, d: BridgeDeps): AgentStepResult {
  if (isGroupNode(target)) {
    const group = getNodeGroup(target);
    if (group?.name === "All")
      return fail("The “All” group is system-managed and can't be deleted.");
    d.deleteGroup(target);
    return ok(`Marked group “${group?.name}” for deletion.`);
  }
  if (
    target.type === NodeType.ResourceNode &&
    !target.id.startsWith("resource-new-")
  ) {
    d.deleteResource(target.id);
    return ok(`Marked ${refOf(target)} for deletion.`);
  }
  // Everything else has nothing account-side to delete (placeholders, draft
  // nodes) — taking it off the canvas IS the whole operation.
  if (!d.canRemoveNode(target))
    return fail(`${refOf(target)} can't be removed.`);
  d.removeNode(target);
  return ok(`Removed ${refOf(target)} from the draft.`);
}

/**
 * The lane a kind belongs in. Groups alternate: the first goes left (a source),
 * the next right (a destination), which is how a two-sided policy reads.
 */
function laneFor(kind: AgentAddItem["kind"], role?: AgentAddItem["role"]): Lane {
  if (kind === "new_policy" || kind === "existing_policy") return "center";
  // The caller knows which end of the policy this is; the canvas can't guess.
  // Without it a destination server lands on the sources side and only finds
  // its column when the arrange runs, which reads as the node jumping.
  if (role === "source") return "left";
  if (role === "destination") return "right";
  if (
    kind === "new_network" ||
    kind === "existing_network" ||
    kind === "new_resource"
  ) {
    return "right";
  }
  if (kind === "new_group" || kind === "existing_group") {
    return placement.left > placement.right ? "right" : "left";
  }
  return "left";
}

/**
 * Next free spot in a lane. The anchor is computed once per draft from what's
 * already on the canvas: an empty draft builds around the origin, while a draft
 * carried over from a live view gets its new nodes below the existing world
 * rather than on top of it.
 */
function nextPlacement(
  kind: AgentAddItem["kind"],
  role: AgentAddItem["role"],
  d: BridgeDeps,
): { x: number; y: number } {
  const key = `${d.draft.isDraft}:${d.draft.draftSession}`;
  if (placement.key !== key) {
    placement = { key, anchor: null, framed: false, left: 0, center: 0, right: 0 };
  }
  if (!placement.anchor) {
    const top = d.reactFlow.getNodes().filter((n) => !n.parentId);
    if (top.length === 0) {
      placement.anchor = { x: 0, y: 0 };
    } else {
      const xs = top.map((n) => n.position.x);
      const ys = top.map((n) => n.position.y + (n.measured?.height ?? 120));
      placement.anchor = {
        x: (Math.min(...xs) + Math.max(...xs)) / 2,
        y: Math.max(...ys) + 260,
      };
    }
  }
  const lane = laneFor(kind, role);
  const index = placement[lane]++;
  return {
    x: placement.anchor.x + LANE_X[lane],
    y: placement.anchor.y + index * LANE_PITCH,
  };
}

/**
 * Frames the area the build is going to occupy, once, before the first node
 * lands in it.
 *
 * Placing incrementally and letting the camera chase each node is how a
 * destination group ended up off-screen: the first node looked centred, and
 * every one after it walked further right. The columns are known up front, so
 * the viewport can just cover them — after which nothing added needs the camera
 * to move at all.
 */
function frameBuildArea(d: BridgeDeps) {
  if (placement.framed || !placement.anchor) return;
  placement.framed = true;
  const { x, y } = placement.anchor;
  void d.reactFlow.fitBounds(
    {
      x: x + LANE_X.left - BUILD_AREA_MARGIN,
      y: y - BUILD_AREA_MARGIN,
      width: LANE_X.right - LANE_X.left + BUILD_AREA_MARGIN * 2 + 300,
      height: BUILD_AREA_HEIGHT,
    },
    { duration: 500 },
  );
}

/**
 * Keeps the step the user is watching on screen — and only then. A node already
 * in view moves nothing (a camera that twitches on every step is worse than one
 * that sits still); a node outside it FITS the whole graph rather than centring
 * on the newcomer, which would push everything it connects to off the far edge.
 */
async function revealNode(nodeId: string, d: BridgeDeps) {
  /*
    Wait for measurement first. React Flow computes bounds from measured nodes
    only, so fitting the instant a node is created quietly leaves the newcomer
    out of the bounds it was supposed to bring into view.
  */
  for (let i = 0; i < 12; i++) {
    const n = d.reactFlow.getNodes().find((x) => x.id === nodeId);
    if ((n?.measured?.width ?? 0) > 0 || Number(n?.style?.width) > 0) break;
    await nextFrame();
  }

  const node = d.reactFlow.getNodes().find((n) => n.id === nodeId);
  if (!node) return;
  const pane = document.querySelector<HTMLElement>(".react-flow");
  const rect = pane?.getBoundingClientRect();
  if (!rect || rect.width === 0) return;

  const vp = d.reactFlow.getViewport();
  // `Number(undefined)` is NaN, and NaN survives `??` — which made every
  // comparison below false, so "is it visible" always answered no.
  const width = node.measured?.width || Number(node.style?.width) || 200;
  const height = node.measured?.height || Number(node.style?.height) || 100;
  const cx = node.position.x + width / 2;
  const cy = node.position.y + height / 2;
  const screenX = cx * vp.zoom + vp.x;
  const screenY = cy * vp.zoom + vp.y;
  const margin = 80;
  const visible =
    screenX > margin &&
    screenY > margin &&
    screenX < rect.width - margin &&
    screenY < rect.height - margin;
  if (visible) return;

  void d.reactFlow.fitView({
    nodes: d.reactFlow.getNodes().filter((n) => !n.hidden && !n.parentId),
    padding: 0.15,
    duration: 500,
    maxZoom: 0.8,
  });
}

const GROUPS_NEED_DRAFT =
  "Group membership is a draft action — start a draft first.";

/**
 * Puts a peer or resource that isn't on the canvas into a group, the way the
 * group panel's drop zone does. `action.node` is the entity's own id here, not a
 * canvas node's.
 */
function assignEntityToGroup(
  action: AgentNodeAction,
  d: BridgeDeps,
): AgentStepResult {
  const group = d.reactFlow.getNodes().find((n) => n.id === action.group);
  if (!group || !isGroupNode(group))
    return fail(`${action.group ?? "(no group)"} isn't a group node.`);

  const peer = d.data.peers?.find((p: Peer) => p.id === action.node);
  const resource = peer
    ? undefined
    : d.data.networkResources?.find(
        (r: NetworkResource) => r.id === action.node,
      );
  if (!peer && !resource) {
    return fail(
      `${action.node} is neither a node on the canvas nor a peer or resource in the account.`,
    );
  }

  const itemId = action.node;
  if (groupContainsItem(group, itemId)) {
    // Already a member — the same no-op a drag onto its own group is. Said out
    // loud rather than reported as an absorb that didn't happen.
    return ok(
      `Already in “${getNodeGroup(group)?.name}” — nothing to change.`,
    );
  }

  /*
    The entity may ALSO be on the canvas — the caller can name a peer either way,
    and passing its account id is the natural thing to do when it has just read
    `list_peers`. Its card still has to be absorbed into the group, exactly as a
    drag would: without `draggedNodeId` the group counted the peer while its card
    stayed sitting on the canvas.
  */
  const card = d.reactFlow.getNodes().find((n) => {
    if (peer) {
      const nodePeer =
        (n.data as { peer?: Peer })?.peer ?? getPlaceholderPeer(n);
      return nodePeer?.id === peer.id;
    }
    return (
      (n.data as { resource?: NetworkResource })?.resource?.id === resource?.id
    );
  });

  d.addMemberToGroup(group, {
    peer,
    resource,
    itemId: action.node,
    draggedNodeId: card?.id,
  });
  return ok(
    `Added ${peer ? card?.id ?? action.node : `“${resource?.name}”`} to “${
      getNodeGroup(group)?.name
    }”${card ? " — its card is now part of the group" : ""}.`,
  );
}

/** Whether a group name is already in use (API, canvas, or pending creates). */
function groupNameTaken(
  name: string,
  d: BridgeDeps,
  exceptNodeId?: string,
): string | null {
  if (name.trim().toLowerCase() === "all")
    return "“All” is the system group's name and can't be reused.";
  const ownName = exceptNodeId
    ? getNodeGroup(d.reactFlow.getNodes().find((n) => n.id === exceptNodeId))
        ?.name
    : undefined;
  const clash =
    d.data.groups?.some((g: Group) => g.name === name) ||
    d.reactFlow
      .getNodes()
      .some((n) => n.id !== exceptNodeId && getNodeGroup(n)?.name === name) ||
    // A pending create for the group being renamed is not a collision with
    // itself — that read "already exists" for a group the caller had just made.
    d.changes.some(
      (c) =>
        c.type === "create-group" &&
        c.name === name &&
        c.clientId !== exceptNodeId &&
        c.name !== ownName,
    );
  return clash
    ? `A group called “${name}” already exists — pick another name.`
    : null;
}

/**
 * Whether a policy's destination side is resources only — a resource, or groups
 * that hold resources and no peers. Those policies are locked one-way (see
 * `destinationOnlyResources` in useAccessControl); NetBird has no way to
 * initiate a connection FROM a subnet or a domain.
 */
function destinationIsResourceOnly(
  rule: Policy["rules"][number],
  d: BridgeDeps,
): boolean {
  if (rule.destinationResource) return true;
  const destinations = (rule.destinations ?? []) as (Group | string)[];
  if (destinations.length === 0) return false;
  return destinations.every((entry) => {
    const group =
      typeof entry === "string"
        ? d.data.groups?.find((g: Group) => g.id === entry)
        : entry;
    const peers = group?.peers_count ?? (group?.peers as unknown[] | undefined)?.length ?? 0;
    const resources =
      group?.resources_count ?? (group?.resources as unknown[] | undefined)?.length ?? 0;
    return resources > 0 && peers === 0;
  });
}

/**
 * Edits a draft policy — the fields its editor exposes. The changeset write goes
 * through `updateDraftPolicy`, which is also what the policy modal calls, so an
 * assistant edit and a hand edit produce the same change (and the same redraw).
 */
function editPolicy(edit: AgentPolicyEdit, d: BridgeDeps): AgentStepResult {
  const node = d.reactFlow.getNodes().find((n) => n.id === edit.node);
  const current = (node?.data as { policy?: Policy })?.policy;
  if (!node || !current)
    return fail(`${edit.node} isn't a policy on the canvas.`);

  const rule = current.rules?.[0];
  if (!rule) return fail("That policy has no rule to edit.");

  if (edit.bidirectional === true && destinationIsResourceOnly(rule, d)) {
    return fail(
      "That policy's destination is a network resource, and resource access is one-way — the same lock the policy editor applies. Left it one-way.",
    );
  }

  const protocol = edit.protocol ?? rule.protocol;
  const portsGiven = edit.ports !== undefined;
  // Ports only mean anything for TCP/UDP; the API rejects them otherwise, so a
  // protocol switch away from them clears the list rather than shipping a 422.
  const portsAllowed = protocol === "tcp" || protocol === "udp";
  const ports = portsAllowed ? (portsGiven ? edit.ports! : rule.ports) : [];

  const next: Policy = {
    ...current,
    name: edit.name ?? current.name,
    description: edit.description ?? current.description,
    enabled: edit.enabled ?? current.enabled,
    rules: [
      {
        ...rule,
        name: edit.name ?? rule.name,
        description: edit.description ?? rule.description,
        enabled: edit.enabled ?? rule.enabled,
        protocol,
        ports,
        bidirectional: edit.bidirectional ?? rule.bidirectional,
      },
      ...(current.rules?.slice(1) ?? []),
    ],
  };

  if (portsGiven && !portsAllowed) {
    return fail(
      `Ports need protocol tcp or udp — “${protocol}” takes none. Nothing changed.`,
    );
  }

  // TEMP DIAGNOSTIC — remove once the protocol-display bug is settled.
  console.info(
    "[ccdiag] editPolicy " +
      JSON.stringify({
        node: edit.node,
        editProtocol: edit.protocol,
        editPorts: edit.ports,
        nextProtocol: next.rules?.[0]?.protocol,
        policyId: next.id,
      }),
  );

  d.updateDraftPolicy(next);

  /*
    Report the rule as it now stands, not the edit that was asked for. The
    model describes the draft from these results, and a bare "Updated policy X"
    let it narrate its own intent — it said it had made the rule TCP whether or
    not the protocol survived the write. Echoing the landed values gives it
    something that can contradict it.
  */
  const landed = `${protocol}${
    ports.length > 0 ? ` on ${ports.join(", ")}` : ", all ports"
  }${next.rules?.[0]?.bidirectional ? ", both directions" : ""}`;
  return ok(
    `Updated policy “${next.name}”${
      edit.enabled === false ? " (disabled)" : ""
    } — it now allows ${landed}.`,
    node.id,
  );
}

// ── describing the canvas ────────────────────────────────────────────────────

const KINDS: Record<string, AgentNodeKind> = {
  [NodeType.PeerNode]: "peer",
  [NodeType.SourcePeerNode]: "peer",
  [NodeType.ExpandedGroupPeer]: "peer",
  [NodeType.GroupNode]: "group",
  [NodeType.SourceGroupNode]: "group",
  [NodeType.DestinationGroupNode]: "group",
  [NodeType.PolicyNode]: "policy",
  [NodeType.NetworkNode]: "network",
  [NodeType.ResourceNode]: "resource",
  [NodeType.DestinationResourceNode]: "resource",
  [NodeType.ResourceGroupNode]: "resource-group",
  [NodeType.SelectPeerNode]: "selector",
  [NodeType.SelectGroupNode]: "selector",
  [NodeType.SelectUserNode]: "selector",
};

function labelOf(node: Node): string {
  const data = node.data as {
    peer?: { name?: string };
    group?: { name?: string };
    policy?: { name?: string };
    network?: { name?: string };
    resource?: { name?: string };
    placeholderName?: string;
  };
  return (
    data?.placeholderName ??
    data?.peer?.name ??
    data?.group?.name ??
    data?.policy?.name ??
    data?.network?.name ??
    data?.resource?.name ??
    node.id
  );
}

/**
 * How a step's `detail` names a node. A peer's name is a person's machine, so
 * it goes out as the canvas id (the caller swaps in a token); everything else
 * is an admin-chosen label and reads better as itself.
 */
function refOf(node: Node): string {
  const kind = KINDS[node.type ?? ""] ?? "other";
  const placeholder = (node.data as { placeholderKind?: string })
    ?.placeholderKind;
  if (kind === "peer" && !placeholder) return node.id;
  return `“${labelOf(node)}”`;
}

/** The account entity behind a node, if it has a real id. */
function entityOf(node: Node): AgentNode["entity"] {
  const data = node.data as {
    peer?: { id?: string };
    group?: { id?: string };
    policy?: { id?: string };
    network?: { id?: string };
    resource?: { id?: string };
  };
  const pairs = [
    ["peer", data?.peer?.id],
    ["group", data?.group?.id],
    ["policy", data?.policy?.id],
    ["network", data?.network?.id],
    ["resource", data?.resource?.id],
  ] as const;
  for (const [kind, id] of pairs) {
    // Client ids (`new-…`) are draft-local — there is no account entity yet.
    if (id && !id.startsWith("new-")) return { kind, id };
  }
  return undefined;
}

function describeNode(node: Node, d: BridgeDeps): AgentNode {
  const kind = KINDS[node.type ?? ""] ?? "other";
  const placeholder = (
    node.data as { placeholderKind?: AgentNode["placeholder"] }
  )?.placeholderKind;
  const isDraft = d.draft.isDraft;

  return {
    nodeId: node.id,
    kind,
    label: labelOf(node),
    // A peer's name is a person's machine — the assistant only ever sees a
    // token for it. Group/policy/network/resource names are admin-chosen
    // labels and pass through as written.
    labelIsPersonal: kind === "peer" && !placeholder,
    entity: entityOf(node),
    placeholder,
    enabled: ((node.data as { enabled?: boolean })?.enabled ?? true) as boolean,
    parentNodeId: node.parentId,
    frame: isFrameNode(node) || undefined,
    can: {
      rename:
        isDraft &&
        (isGroupNode(node) ||
          !!placeholder ||
          node.id.startsWith("resource-new-") ||
          isDraftNetworkNode(node)),
      remove: isDraft && d.canRemoveNode(node),
      delete:
        isDraft &&
        (isGroupNode(node) ||
          kind === "resource" ||
          kind === "network" ||
          kind === "policy"),
    },
  };
}

/**
 * Some connects finish in a dialog the user has to fill in — the model needs to
 * know that, so it says so instead of assuming the policy is done.
 */
function dialogNote(from: Node, to: Node): string {
  const kinds = [from, to].map((n) => KINDS[n.type ?? ""] ?? "other");
  if (!kinds.includes("policy")) {
    return " Neither side is a policy, so the create-policy dialog opened for the user to finish.";
  }
  if (kinds.includes("network")) {
    return " A network has several possible destinations, so the picker opened for the user to choose one.";
  }
  return "";
}

/**
 * Which handle a programmatic connect should look like it came from.
 *
 * `node → policy` means "this is a source", so it starts at the node's RIGHT
 * handle — except for resources and network frames, which only ever sit on the
 * destination side and only carry a LEFT handle. Getting this wrong isn't an
 * error, it's silence: the connect rules drop a resource aimed at a source side.
 */
function startHandle(from: Node, to: Node): string {
  const kind = KINDS[from.type ?? ""] ?? "other";
  const destinationOnly = kind === "resource" || kind === "network";
  return to.type === NodeType.PolicyNode && destinationOnly
    ? "sl-connect"
    : "sr-connect";
}

const onCanvas = (nodeId: string, d: BridgeDeps): boolean =>
  d.reactFlow.getNodes().some((n) => n.id === nodeId);

/** A frame's network ref — real id for an existing network, client id for a draft one. */
const frameRef = (frame: Node) => {
  const network = (frame.data as { network?: { id?: string; name?: string } })
    ?.network;
  return {
    networkId: network?.id ?? frame.id.replace("network-", ""),
    name: network?.name ?? "Network",
  };
};

const resolveNetwork = (
  target: string | undefined,
  d: BridgeDeps,
): Network | undefined =>
  target
    ? d.data.networks?.find((n) => n.id === target || n.name === target)
    : undefined;

/** Which entity a live view should be built around; `"self"` means the user's own. */
function resolveSubject(
  view: string,
  target: string | undefined,
  d: BridgeDeps,
): { id?: string; detail: string } {
  const userId = d.canvas.loggedInUser?.id;
  if (!target) return { detail: `Opened the ${view} view.` };

  if (view === "peers") {
    const peer =
      target === "self"
        ? d.data.peers?.find((p: Peer) => p.user_id === userId)
        : d.data.peers?.find((p: Peer) => p.id === target);
    return peer
      ? { id: peer.id, detail: "Opened the peer view for that device." }
      : { detail: `No peer matches ${target}.` };
  }
  if (view === "users") {
    const user =
      target === "self"
        ? d.data.users?.find((u) => u.id === userId)
        : d.data.users?.find((u) => u.id === target);
    return user
      ? { id: user.id, detail: "Opened the user view for that user." }
      : { detail: `No user matches ${target}.` };
  }
  if (view === "groups") {
    const group = d.data.groups?.find(
      (g: Group) => g.id === target || g.name === target,
    );
    return group
      ? { id: group.id, detail: `Opened the group view for “${group.name}”.` }
      : { detail: `No group matches ${target}.` };
  }
  return { detail: `Opened the ${view} view.` };
}
