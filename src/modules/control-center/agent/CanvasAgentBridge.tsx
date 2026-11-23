"use client";

import { e2eHooksEnabled } from "@utils/netbird";
import { Connection, Node, useReactFlow } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";
import { useDialog } from "@/contexts/DialogProvider";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy, PortRange } from "@/interfaces/Policy";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import type {
  AgentPolicy,
  AIProvider,
} from "@/modules/agent-network/data/mockData";
import { useAgentNetworkMode } from "@/modules/agent-network/useAgentNetworkMode";
import { useBootstrapCluster } from "@/modules/agent-network/useBootstrapCluster";
import { AgentAddItem, AgentCanvasAction, AgentCanvasSnapshot, AgentDraftAction, AgentLink, AgentNavigateInput, AgentNode, AgentNodeAction, AgentNodeKind, AgentPolicyEdit, AgentStepResult, agentTurnGeneration, beginAgentActivity, beginAgentTurn, CanvasAgentApi, registerCanvasAgent } from "@/modules/assistant/lib/canvas";
import {
  CanvasPolicy,
  connectBlockedByDialog,
  ConnectEvidence,
  ConnectOutcome,
  connectOutcome,
  connectSide,
  consequencesText,
  describePolicySide,
  holdsLiveSetupKey,
  holdsSessionArtifacts,
  liveSetupKeyGuards,
  policyConsequences,
  policyEntityKey,
  policySidesKey,
  portsLabel,
  samePortRanges,
  strippedCanvasPolicies,
} from "@/modules/control-center/agent/bridge-logic";
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
import { useCanDeleteGroup } from "@/modules/control-center/hooks/useCanDeleteGroup";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { deployInFlight } from "@/modules/control-center/hooks/useDeployChangeset";
import { useDraftEntityDrop } from "@/modules/control-center/hooks/useDraftEntityDrop";
import {
  canRenameGroup,
  getNodeGroup,
  isAllGroup,
  isGroupNode,
  isNewGroup,
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
import { usePendingArtifacts } from "@/modules/control-center/hooks/usePlaceholderArtifacts";
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

export const CanvasAgentBridge = ({
  onConnect,
}: {
  onConnect: (connection: Connection) => void;
}) => {
  const deps = useBridgeDeps(onConnect);

  // Assigned during render, not in an effect: a step acting on what the
  // previous step just created would otherwise run against stale closures.
  const latest = useRef(deps);
  // eslint-disable-next-line react-hooks/refs
  latest.current = deps;

  useEffect(() => {
    const api = buildApi(() => latest.current);
    const host = globalThis as unknown as {
      __controlCenterAgent?: CanvasAgentApi & { beginTurn: () => () => void };
    };
    const exposed = e2eHooksEnabled()
      ? { ...api, beginTurn: beginAgentTurn }
      : undefined;
    if (exposed) host.__controlCenterAgent = exposed;
    const unregister = registerCanvasAgent(api);
    return () => {
      unregister();
      cancelArrange();
      if (exposed && host.__controlCenterAgent === exposed) {
        delete host.__controlCenterAgent;
      }
    };
  }, []);

  const isDraft = deps.draft.isDraft;
  useEffect(
    () => () => {
      resetPlacement();
      cancelArrange();
    },
    [isDraft],
  );

  return null;
};

function useBridgeDeps(onConnect: (connection: Connection) => void) {
  const reactFlow = useReactFlow();
  const canvas = useCanvasState();
  const ui = useControlCenterUI();
  const draft = useDraftMode();
  const { changes, trackUpdateUserGroups } = useDraftChangeset();
  const data = useControlCenterData();
  const {
    setFocusedNodeId,
    setSelectedDestinationGroup,
    setSelectedPeerPanel,
  } = useDestinationGroup();
  const { discardAndExit } = useDiscardDraft();
  const { confirm } = useDialog();
  const { canDeleteGroup } = useCanDeleteGroup();
  const hasPendingArtifacts = usePendingArtifacts();
  const camera = useAutoArrange();
  const creation = useDraftNodeCreation();
  const drop = useDraftEntityDrop();
  const groupActions = useDraftGroupActions();
  const networkActions = useDraftNetworkActions();
  const nodeActions = useDraftNodeActions();
  const removal = useNodeRemoval();
  const { addMemberToGroup } = useDragToGroup();
  const { updateDraftPolicy, requestProvider, drawAgentPolicyOnCanvas } =
    useControlCenterPolicy();
  const { enabled: agentNetworkEnabled } = useAgentNetworkMode();
  const { providers: agentProviders, policies: agentPolicies } =
    useAIProviders();
  const [clusterWanted, setClusterWanted] = useState(false);
  const cluster = useBootstrapCluster(clusterWanted);
  const bootstrapCluster = {
    ...cluster,
    ready: cluster.bootstrapped || (clusterWanted && !cluster.loading),
    request: () => setClusterWanted(true),
  };

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
    confirm,
    canDeleteGroup,
    hasPendingArtifacts,
    ...camera,
    ...creation,
    ...drop,
    ...groupActions,
    ...networkActions,
    ...nodeActions,
    ...removal,
    addMemberToGroup,
    trackUpdateUserGroups,
    updateDraftPolicy,
    requestProvider,
    drawAgentPolicyOnCanvas,
    agentNetworkEnabled,
    agentProviders,
    agentPolicies,
    bootstrapCluster,
  };
}

type BridgeDeps = ReturnType<typeof useBridgeDeps>;
type Deps = () => BridgeDeps;

// ── pacing ───────────────────────────────────────────────────────────────────

const STEP_MS = 260;
// Longer than a model round trip, so a whole build settles into one arrange.
const ARRANGE_IDLE_MS = 3500;

// The same columns the draft layout uses.
const LANE_X = { left: 0, center: 500, right: 1000 } as const;
const LANE_PITCH = 170;
const BUILD_AREA_MARGIN = 260;
const BUILD_AREA_HEIGHT = 620;

type Lane = keyof typeof LANE_X;

const emptyPlacement = () => ({
  anchor: null as { x: number; y: number } | null,
  framed: null as { min: number; max: number } | null,
  left: 0,
  center: 0,
  right: 0,
});

let placement = emptyPlacement();

const resetPlacement = () => {
  placement = emptyPlacement();
};

const quoted = (name?: string) => (name ? ` “${name}”` : "");
const plural = (count: number, word: string) => (count === 1 ? word : `${word}s`);

function withSelectorSubject(prev: Node[], selectorId: string | undefined, key: string | undefined, subjectId: string): Node[] {
  if (!key) return prev;
  const stale = prev.some((n) => n.id === selectorId && n.data?.[key] !== subjectId);
  if (!stale) return prev;
  return prev.map((n) => (n.id === selectorId ? { ...n, data: { ...n.data, [key]: subjectId } } : n));
}

const wait = (ms: number) => new Promise((r) => globalThis.setTimeout(r, ms));
const FRAME_TIMEOUT_MS = 100;
const nextFrame = () =>
  new Promise<void>((resolve) => {
    const done = () => {
      globalThis.clearTimeout(timer);
      globalThis.cancelAnimationFrame(frame);
      resolve();
    };
    const timer = globalThis.setTimeout(done, FRAME_TIMEOUT_MS);
    const frame = globalThis.requestAnimationFrame(done);
  });
// Two frames straddle a React commit; a bare zero-timeout can fire before it
// under concurrent rendering.
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

const TURN_ENDED =
  "Not run: the assistant's turn was stopped or reset before this step. If the turn is in fact still going, send the remaining steps again.";
const DEPLOYING =
  "Not run: the draft is being deployed right now, and changing it mid-deploy would desync what lands. Wait for the deploy to finish.";
const DIALOG_WAITING =
  "Not connected: a dialog is already open and waiting for the user, and connecting now would overwrite what it was opened with. Nothing changed. Ask the user to finish or close that dialog, then send the remaining connects again.";
const STILL_BUSY =
  "Not run: the canvas is still busy with an earlier step — a dialog may be waiting for the user. Try again once it has finished.";
const BUSY_WAIT_MS = 15_000;

type Halted = () => string | null;

let running = false;
const waiting: symbol[] = [];

async function acting<T>(
  run: (halted: Halted) => Promise<T>,
  refuse: (step: AgentStepResult) => T,
  { writes = true } = {},
): Promise<T> {
  const generation = agentTurnGeneration();
  const halted: Halted = () => {
    if (generation !== agentTurnGeneration()) return TURN_ENDED;
    if (writes && deployInFlight.current) return DEPLOYING;
    return null;
  };

  const ticket = Symbol("canvas-call");
  waiting.push(ticket);
  const queuedAt = Date.now();
  while (running || waiting[0] !== ticket) {
    if (Date.now() - queuedAt > BUSY_WAIT_MS) {
      waiting.splice(waiting.indexOf(ticket), 1);
      return refuse(fail(STILL_BUSY));
    }
    await wait(50);
  }
  waiting.shift();

  const stopped = halted();
  if (stopped) return refuse(fail(stopped));

  running = true;
  const done = beginAgentActivity();
  try {
    return await run(halted);
  } finally {
    running = false;
    done();
  }
}

const single = (step: AgentStepResult) => step;
const listed = (step: AgentStepResult) => [step];

function buildApi(deps: Deps): CanvasAgentApi {
  const snapshot = (): AgentCanvasSnapshot => {
    const d = deps();
    const nodes = d.reactFlow.getNodes();
    const keyed = liveSetupKeyGuards(nodes);

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
      view: d.canvas.currentView,
      drilledNetwork: d.draft.drillDownNetworkNodeId ?? undefined,
      subject: subject(),
      startedBlank: d.draft.startedBlank,
      nodes: nodes.filter((n) => !n.hidden).map((n) => describeNode(n, d, keyed)),
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
    if (view !== "network" && !Object.hasOwn(VIEWS, view)) {
      return fail(
        `There is no “${view}” view — use peers, users, groups, networks or network.`,
      );
    }

    if (d.draft.isDraft) {
      if (d.draft.drillDownNetworkNodeId && view === "networks") {
        d.draft.setDrillDownNetworkNodeId(null);
        return ok("Left the network, back to the full draft.");
      }

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

      const left = await leaveDraft(d);
      if (!left.ok) return left;
      await wait(STEP_MS);
      d = deps();
      const landed = await navigateLive(view, target, d);
      return landed.ok
        ? ok(`${landed.detail} (Left the empty draft to get here.)`)
        : landed;
    }

    return navigateLive(view, target, d);
  };

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

    // The view switch creates the selector node; selecting a subject before it
    // exists leaves the old view's graph on screen.
    const selectorId = SELECTOR_NODES[view];
    const hasSelector = () =>
      !selectorId || d.reactFlow.getNodes().some((n) => n.id === selectorId);
    if (d.canvas.currentView !== VIEWS[view] || !hasSelector()) {
      d.ui.onViewChange(VIEWS[view]);
      if (!resolved.id) return ok(resolved.detail);
      for (let i = 0; i < 40 && !hasSelector(); i++) await wait(50);
      if (!hasSelector()) return ok(`Opened the ${view} view (it's empty).`);
    }
    if (!resolved.id) return ok(resolved.detail);

    d.canvas.setSelectedDestinationGroup("");
    d.canvas.setSelectedNetwork("");
    if (view === "peers") d.canvas.setSelectedPeer(resolved.id);
    if (view === "users") d.canvas.setSelectedUser(resolved.id);
    if (view === "groups") d.canvas.setSelectedGroup(resolved.id);
    d.canvas.setLayoutInitialized(false);

    // Synced twice: the rebuild can write an older copy of the selector node
    // back over the first one.
    const subjectId = resolved.id;
    const key = SELECTOR_DATA_KEYS[view];
    const syncSelector = () =>
      d.reactFlow.setNodes((prev) => withSelectorSubject(prev, selectorId, key, subjectId));
    syncSelector();
    await wait(STEP_MS);
    syncSelector();
    return ok(resolved.detail);
  };

  const draftAction = async (
    action: AgentDraftAction,
  ): Promise<AgentStepResult> => {
    const d = deps();
    if (action === "exit") {
      if (!d.draft.isDraft) return ok("Already in live mode.");
      return leaveDraft(d);
    }
    if (action !== "new_empty" && action !== "from_current_view") {
      return fail(
        `Unknown draft action “${action}” — use new_empty, from_current_view or exit.`,
      );
    }
    if (d.draft.isDraft) {
      return ok("Already in a draft — kept it and its changes.");
    }
    if (action === "new_empty") {
      d.draft.startBlankDraft();
      await wait(STEP_MS);
      return ok("Started a new empty draft.");
    }
    // Right after a navigation the live view is still building, and a draft
    // started now would copy an empty canvas.
    for (let i = 0; i < 40 && d.reactFlow.getNodes().length === 0; i++) {
      await wait(50);
    }
    d.draft.startCurrentDraft();
    await wait(STEP_MS);
    return ok("Started a draft from the current view.");
  };

  const add = async (
    items: AgentAddItem[],
    final: boolean,
    halted: Halted,
  ): Promise<AgentStepResult[]> => {
    const results: AgentStepResult[] = [];
    for (const item of items) {
      const stopped = halted();
      if (stopped) {
        results.push(fail(stopped));
        break;
      }
      const blocked = requireDraft(deps());
      if (blocked) {
        results.push(blocked);
        break;
      }
      const step = await addOne(item, deps(), deps);
      results.push(step);
      if (step.ok && step.nodeId) {
        const d = deps();
        spawnNodes(d.reactFlow, [step.nodeId]);
        pulseNodes(d.reactFlow, [step.nodeId]);
        await revealNode(step.nodeId, d);
      }
      await wait(STEP_MS);
    }
    if (final && results.some((r) => r.ok)) results.push(arrangeNow(deps));
    return results;
  };

  const connect = async (
    links: AgentLink[],
    final: boolean,
    halted: Halted,
  ): Promise<AgentStepResult[]> => {
    const results: AgentStepResult[] = [];
    for (const link of links) {
      const stopped = halted();
      if (stopped) {
        results.push(fail(stopped));
        break;
      }
      let d = deps();
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
      if (connectBlockedByDialog(connectEvidence(d))) {
        results.push(fail(DIALOG_WAITING));
        break;
      }
      const marked = markByAssistant(d, [from.id, to.id]);
      if (marked.length > 0) {
        await settle();
        d = deps();
      }
      const before = connectEvidence(d);
      const sourceHandle = startHandle(from, to);
      d.onConnect({
        source: from.id,
        target: to.id,
        sourceHandle,
        targetHandle: null,
      });

      let outcome: ConnectOutcome = "nothing";
      let fresh: string[] = [];
      for (let i = 0; i < 4 && outcome === "nothing"; i++) {
        await settle();
        const after = connectEvidence(deps());
        fresh = [...after.edges].filter((id) => !before.edges.has(id));
        outcome = connectOutcome(before, after);
        if (outcome === "nothing") await wait(25);
      }

      if (outcome === "nothing") {
        unmarkByAssistant(d, marked);
        results.push(fail(nothingConnected(from, to, sourceHandle)));
        continue;
      }
      results.push(
        outcome === "connected"
          ? ok(`Connected ${refOf(from)} → ${refOf(to)}.`)
          : ok(
              `Nothing is connected yet between ${refOf(from)} and ${refOf(
                to,
              )}.${dialogNote(from, to)}`,
            ),
      );
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
    final: boolean,
    halted: Halted,
  ): Promise<AgentStepResult[]> => {
    const results: AgentStepResult[] = [];
    let movedThings = false;
    for (const action of actions) {
      const stopped = halted();
      if (stopped) {
        results.push(fail(stopped));
        break;
      }
      const result = await nodeOne(action, deps);
      results.push(result);
      if (result.ok) {
        const d = deps();
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
    if (final && results.some((r) => r.ok)) results.push(arrangeNow(deps));
    else if (movedThings) scheduleArrange(deps);
    return results;
  };

  const policy = async (
    edit: AgentPolicyEdit,
    final: boolean,
    halted: Halted,
  ): Promise<AgentStepResult> => {
    const marked = deps().draft.isDraft
      ? markByAssistant(deps(), [edit.node])
      : [];
    // Settle before reading: `editPolicy` and every connect read-modify-write
    // the whole policy, so an unflushed connect and this edit overwrite each other.
    await settle();
    let d = deps();
    const blocked = requireDraft(d);
    if (blocked) return blocked;
    const halt = halted();
    if (halt) {
      unmarkByAssistant(d, marked);
      return fail(halt);
    }
    let result = editPolicy(edit, d);
    if (!result.ok) unmarkByAssistant(d, marked);
    // A write still in flight can land after this one and revert it, so it is
    // re-applied until it sticks.
    let stopped: string | null = null;
    for (let attempt = 0; result.ok && attempt < 3; attempt++) {
      await settle();
      await wait(STEP_MS);
      d = deps();
      if (editLanded(edit, policyOn(edit.node, d))) break;
      stopped = halted();
      if (stopped) break;
      result = editPolicy(edit, d);
    }
    if (result.ok && !editLanded(edit, policyOn(edit.node, d))) {
      return fail(
        stopped
          ? `The edit to ${edit.node} was written, but the canvas did not show it yet when the turn was stopped or the draft began deploying, so it may or may not have landed. Read control_center_state before assuming either.`
          : "The policy edit did not stick on the canvas. Call control_center_policy again.",
      );
    }
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

  return {
    getSnapshot: snapshot,
    drainNotices: () => notices.splice(0, notices.length),
    goToView: (input) => acting(() => navigate(input), single),
    draftAction: (action) => acting(() => draftAction(action), single),
    addNodes: (items, final = false) =>
      acting((halted) => add(items, final, halted), listed),
    connectNodes: (links, final = false) =>
      acting((halted) => connect(links, final, halted), listed),
    editNodes: (actions, final = false) =>
      acting((halted) => node(actions, final, halted), listed),
    editPolicy: (edit, final = false) =>
      acting((halted) => policy(edit, final, halted), single),
    canvasAction: (action) =>
      acting(() => canvasAction(action), single, { writes: false }),
  };
}
const VIEWS: Record<string, FlowView> = {
  peers: FlowView.PEERS,
  users: FlowView.USERS,
  groups: FlowView.GROUPS,
  networks: FlowView.NETWORKS,
};

const SELECTOR_NODES: Record<string, string | undefined> = {
  peers: "select-peer-node",
  users: "select-user-node",
  groups: "select-group-node",
  networks: undefined,
};

const SELECTOR_DATA_KEYS: Record<string, string | undefined> = {
  peers: "currentPeer",
  users: "currentUser",
  groups: "currentGroup",
};

const LAYOUT_ACTIONS = new Set(["remove", "delete", "add_to_group"]);

const draftIsUntouched = (d: BridgeDeps): boolean =>
  d.reactFlow.getNodes().length === 0 && d.changes.length === 0;

const requireDraft = (d: BridgeDeps): AgentStepResult | null =>
  d.draft.isDraft
    ? null
    : fail("Only possible in draft mode — start a draft first.");

let arrangeTimer: ReturnType<typeof setTimeout> | undefined;
const notices: string[] = [];

function cancelArrange() {
  globalThis.clearTimeout(arrangeTimer);
  arrangeTimer = undefined;
}

function arrangeNow(deps: Deps): AgentStepResult {
  cancelArrange();
  deps().arrange();
  return ok("Arranged the canvas and fitted the view.");
}

function scheduleArrange(deps: Deps) {
  cancelArrange();
  arrangeTimer = globalThis.setTimeout(() => {
    arrangeTimer = undefined;
    const done = beginAgentActivity();
    try {
      deps().arrange();
      notices.push("Auto-arranged the canvas and fitted the view.");
    } finally {
      done();
    }
  }, ARRANGE_IDLE_MS);
}

// ── adding ───────────────────────────────────────────────────────────────────

async function addOne(
  item: AgentAddItem,
  d: BridgeDeps,
  deps: Deps,
): Promise<AgentStepResult> {
  const { kind, ref, name } = item;
  const { lane, ...at } = nextPlacement(kind, item.role, d);
  frameBuildArea(d, lane);

  switch (kind) {
    case "server":
    case "agent":
    case "user_device": {
      const nodeId = d.addPeerPlaceholder(
        kind === "user_device" ? "user-device" : kind,
        at,
        name,
      );
      await settle();
      const landed = (
        d.reactFlow.getNodes().find((n) => n.id === nodeId)?.data as
          | { placeholderName?: string }
          | undefined
      )?.placeholderName;
      const named = landed ?? name;
      const renamed =
        name && landed && landed !== name.trim()
          ? ` (“${name}” is already taken on this canvas)`
          : "";
      return ok(
        `Added a ${kind.replace("_", " ")} placeholder${
          named ? ` named “${named}”` : ""
        }${renamed} — it has to be installed before the draft can deploy.`,
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

    case "new_resource_group": {
      const frame = d.reactFlow
        .getNodes()
        .find((n) => n.id === item.network && isFrameNode(n));
      if (!frame)
        return fail(
          `${item.network ?? "(no network)"} isn't a network frame — a resource group needs the network it belongs to.`,
        );
      const taken = name ? groupNameTaken(name, d) : null;
      if (taken) return fail(taken);
      const peers = (item.members ?? []).filter(
        (member) => !!resolveMember(member, d).peer,
      );
      if (peers.length > 0) {
        return fail(
          `A resource group inside a network holds that network's resources only, and ${peers.join(
            ", ",
          )} ${
            peers.length === 1 ? "is a peer" : "are peers"
          }. Nothing was added — put peers in an ordinary group (new_group).`,
        );
      }
      const before = new Set(d.reactFlow.getNodes().map((n) => n.id));
      d.addResourceGroupToFrame(frame.id);
      await settle();
      const created = d.reactFlow.getNodes().find((n) => !before.has(n.id));
      if (!created) return fail("Could not add the resource group.");
      if (name) {
        d.renameGroup(created, name);
        await settle();
      }
      const joined = item.members?.length
        ? await fillGroup(created.id, item.members, d)
        : 0;
      const network = (frame.data as { network?: Network })?.network;
      const members = item.members?.length ? ` with ${joined} of ${item.members.length} of its resources` : "";
      return ok(`Added the group${quoted(name)} inside “${network?.name ?? "the network"}”${members}.`, created.id);
    }

    case "new_group": {
      const taken = name ? groupNameTaken(name, d) : null;
      if (taken) return fail(taken);
      // `addNewGroup` takes the top-left corner, not the centre like the others.
      const nodeId = d.addNewGroup({ x: at.x - 100, y: at.y - 30 }, name);
      if (!nodeId) return fail("Could not add the group.");

      const added = item.members?.length
        ? await fillGroup(nodeId, item.members, d)
        : 0;
      const count = item.members?.length ?? 0;
      const members = count ? ` with ${added} of ${count} ${plural(count, "member")}` : "";
      return ok(`Added a new group${quoted(name)}${members}.`, nodeId);
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
      let created: Node | undefined;
      for (let i = 0; i < 20 && !created; i++) {
        await settle();
        created = d.reactFlow.getNodes().find((n) => !before.has(n.id));
        if (!created) await wait(25);
      }
      if (!created) {
        return fail(
          `The policy${quoted(
            name,
          )} did not appear on the canvas, so nothing about it is confirmed. Read control_center_state before adding it again — it may still land, and then it has to be checked, not duplicated.`,
        );
      }
      const nodeId = created.id;
      markByAssistant(d, [nodeId]);

      const ranges = takesPorts(item.protocol) ? item.portRanges ?? [] : [];
      if (ranges.length > 0) {
        const narrowing = { node: nodeId, ports: item.ports ?? [], portRanges: ranges };
        for (let attempt = 0; attempt < 3; attempt++) {
          const applied = editPolicy(narrowing, d);
          if (!applied.ok) break;
          await settle();
          if (samePortRanges(policyOn(nodeId, d)?.rules?.[0]?.port_ranges, ranges)) break;
          await wait(25);
        }
      }

      const rule = policyOn(nodeId, d)?.rules?.[0];
      if (!rule) {
        return {
          ...fail(`The policy${quoted(name)} was added but can't be read back. Read control_center_state before describing it.`),
          nodeId,
        };
      }
      const narrowed = rule.protocol !== "all";
      const holds = narrowed
        ? `${rule.protocol}${
            takesPorts(rule.protocol)
              ? portsLabel(rule.ports ?? [], rule.port_ranges)
              : ", all ports"
          }`
        : "ALL protocols on ALL ports";
      if (!samePortRanges(rule.port_ranges, ranges)) {
        return {
          ...fail(
            `The policy${quoted(name)} was added, but its port ranges did NOT land: it currently allows ${holds}, which is wider than asked. Set the ports on it with control_center_policy, or remove it — and don't describe it as restricted until that step succeeds.`,
          ),
          nodeId,
        };
      }
      return ok(
        `Added a${narrowed ? "" : "n empty"} ${
          rule.bidirectional === false ? "one-way " : ""
        }policy${quoted(name)}. It allows ${holds}${
          narrowed
            ? ""
            : " — call control_center_policy to narrow it before you describe it to the user"
        }. Connect a source and a destination to it: a policy with only one side never deploys.`,
        nodeId,
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
      return ok(`Added a new network${quoted(name)}.`, nodeId);
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
      return ok(
        `Added the resource${
          frame ? ` to “${network.name}”` : " — it still needs a network"
        }.`,
        nodeId,
      );
    }

    // Blocks until the operator saves or dismisses the Connect Provider modal:
    // a later step may connect a policy to this node.
    case "new_provider": {
      const off = agentNetworkOff(d);
      if (off) return off;
      const unbootstrappable = noClusterToBootstrap(await bootstrapCluster(deps));
      if (unbootstrappable) return unbootstrappable;
      const outcome = await d.requestProvider(at);
      if (!outcome) {
        return fail(
          "The Connect Provider dialog was dismissed, so no provider was created and nothing was added to the canvas. Don't open it again — tell the user and stop there.",
        );
      }
      await settle();
      return ok(
        `Connected the provider “${outcome.name}”. NetBird holds its API key; agents reach it over the account's endpoint, with no key of their own.`,
        outcome.nodeId,
      );
    }

    case "existing_provider": {
      const off = agentNetworkOff(d);
      if (off) return off;
      const provider = d.agentProviders?.find((p: AIProvider) => p.id === ref);
      if (!provider) return fail(`No AI provider matches ${ref ?? "(no ref)"}.`);
      const nodeId = `provider-${provider.id}`;
      if (onCanvas(nodeId, d))
        return fail(`Provider “${provider.name}” is already on the canvas.`);
      d.placeProviderNode(
        {
          id: provider.id,
          providerId: provider.providerId,
          name: provider.name,
          upstreamUrl: provider.upstreamUrl,
          enabled: provider.status !== "disabled",
        },
        at,
      );
      return ok(`Added the provider “${provider.name}”.`, nodeId);
    }

    case "new_agent_policy": {
      const off = agentNetworkOff(d);
      if (off) return off;
      const nodeId = d.addBlankAgentPolicy(at, {
        name,
        description: item.description,
      });
      await settle();
      markByAssistant(d, [nodeId]);
      return ok(
        `Added an agent policy${
          name ? ` “${name}”` : ""
        }. Connect a source group to it and it to a provider: one with a side missing never deploys.`,
        nodeId,
      );
    }

    case "existing_agent_policy": {
      const off = agentNetworkOff(d);
      if (off) return off;
      const policy = d.agentPolicies?.find((p: AgentPolicy) => p.id === ref);
      if (!policy) return fail(`No agent policy matches ${ref ?? "(no ref)"}.`);
      const nodeId = `agent-policy-${policy.id}`;
      if (onCanvas(nodeId, d))
        return fail(`Agent policy “${policy.name}” is already on the canvas.`);
      d.drawAgentPolicyOnCanvas(policy, at);
      await settle();
      return ok(
        `Added the agent policy “${policy.name}” together with its source groups and providers.`,
        nodeId,
      );
    }

    default:
      return fail(`Unknown kind “${kind}”.`);
  }
}

const agentNetworkOff = (d: BridgeDeps): AgentStepResult | null =>
  d.agentNetworkEnabled
    ? null
    : fail(
        "Agent Network isn't enabled on this account, so there are no AI providers or agent policies to work with.",
      );

const CLUSTER_WAIT_MS = 8000;

async function bootstrapCluster(deps: Deps): Promise<BridgeDeps["bootstrapCluster"]> {
  deps().bootstrapCluster.request();
  const deadline = Date.now() + CLUSTER_WAIT_MS;
  while (!deps().bootstrapCluster.ready && Date.now() < deadline) await wait(50);
  return deps().bootstrapCluster;
}

const noClusterToBootstrap = (
  cluster: BridgeDeps["bootstrapCluster"],
): AgentStepResult | null => {
  const { ready, bootstrapped, canReadDomains, noClustersAvailable, clustersLackPrivateCapability } =
    cluster;
  if (!ready || bootstrapped || !noClustersAvailable) return null;
  if (!canReadDomains) {
    return fail(
      "This account has no Agent Network endpoint yet, and the first provider has to create one on a proxy cluster — which this role can't read. Tell the user an account admin has to connect the first provider, and stop.",
    );
  }
  return fail(
    clustersLackPrivateCapability
      ? "This account has no Agent Network endpoint yet, and the first provider has to create one on a proxy cluster. The account has clusters but none of them supports private services, which the agent-network gateway needs. Tell the user to set one up under Reverse Proxy first, and stop — don't open the Connect Provider dialog."
      : "This account has no Agent Network endpoint yet, and the first provider has to create one on a proxy cluster — there isn't one. Tell the user to create a proxy cluster under Reverse Proxy first, and stop — don't open the Connect Provider dialog.",
  );
};

// A draft resource's `data.resource` has no id (`getDraftResource` synthesizes
// it), and `addMemberToGroup` silently drops a member without an `itemId`.
function resolveMember(
  id: string,
  d: BridgeDeps,
): {
  peer?: Peer;
  resource?: NetworkResource;
  itemId?: string;
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
    if (peer && group.type === NodeType.ResourceGroupNode) continue;

    d.addMemberToGroup(group, {
      peer,
      resource,
      itemId,
      draggedNodeId: nodeId,
      keepFramedCard: true,
    });
    // Counted from the canvas: `addMemberToGroup`'s early returns are silent.
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
  deps: Deps,
): Promise<AgentStepResult> {
  const d = deps();
  const target = d.reactFlow.getNodes().find((n) => n.id === action.node);

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
      const keyed = liveSetupKeyRefusal(target, d);
      if (keyed) return fail(keyed);
      const before = policyState(d);
      d.removeNode(target);
      if (isPolicyCard(target)) {
        return ok(`Removed ${refOf(target)} from the draft.`);
      }
      const caused = await policyFallout(before, deps);
      return ok(
        `Removed ${refOf(target)} from the canvas. ${
          caused ||
          "No policy changed as a result, and nothing in the account will be deleted."
        }`,
      );
    }

    case "delete": {
      const blocked = draftOnly();
      if (blocked) return blocked;
      const refused = deleteRefusal(target, d);
      if (refused) return fail(refused);
      const before = policyState(d);
      const result = deleteInDraft(target, d);
      if (isPolicyCard(target)) return result;
      const caused = await policyFallout(before, deps);
      return ok(
        `${result.detail} ${caused || "No policy changed as a result."}`,
      );
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
      if (peer && group.type === NodeType.ResourceGroupNode)
        return fail(
          `${refOf(target)} is a peer. A resource group inside a network holds that network's resources only, so nothing was added. Put peers in an ordinary group (new_group).`,
        );
      d.addMemberToGroup(group, {
        peer,
        resource,
        itemId,
        draggedNodeId: target.id,
        keepFramedCard: true,
      });
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
      const kept = onCanvas(target.id, d);
      return ok(
        `Added ${refOf(target)} to “${getNodeGroup(group)?.name}” — ${
          kept
            ? "its row stays in its network frame"
            : "its own card is now part of the group"
        }.`,
      );
    }

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
    if (isSystemAllGroup(group, d)) {
      return fail("The “All” group is system-managed and can't be renamed.");
    }
    if (!canRenameGroup(group)) {
      return fail(
        `Group “${group?.name}” is synced from the identity provider, so its name can't be changed here — the API refuses the rename.`,
      );
    }
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

function isSystemAllGroup(group: Group | undefined, d: BridgeDeps): boolean {
  if (!group) return false;
  if (isAllGroup(group)) return true;
  return (
    !!group.id &&
    isAllGroup(d.data.groups?.find((g: Group) => g.id === group.id))
  );
}

function liveSetupKeyRefusal(
  target: Node,
  d: BridgeDeps,
  guarded = liveSetupKeyGuards(d.reactFlow.getNodes()),
): string | null {
  if (!guarded.has(target.id)) return null;
  const where = holdsLiveSetupKey(target.data)
    ? "carries a generated setup key"
    : "contains a row that carries a generated setup key";
  return `${refOf(
    target,
  )} ${where} (an install command may already be in use), and taking it off the canvas revokes that live key immediately — not on deploy. The user has to remove it themselves from the node's menu; tell them so and leave it.`;
}

function deleteRefusal(
  target: Node,
  d: BridgeDeps,
  guarded?: Set<string>,
): string | null {
  if (isGroupNode(target)) {
    const group = getNodeGroup(target);
    if (isSystemAllGroup(group, d)) {
      return "The “All” group is system-managed and can't be deleted.";
    }
    if (group && !isNewGroup(group) && !d.canDeleteGroup(group)) {
      return `Group “${group.name}” can't be deleted: it is synced from the identity provider, still in use in the account (peers, users, resources, policies, routes, DNS or setup keys), or this role may not delete groups. Nothing was changed — a group DELETE the API would refuse must not strip policies first. To retire it, take it out of the policies and other objects that use it, then delete it.`;
    }
  }
  const keyed = liveSetupKeyRefusal(target, d, guarded);
  if (keyed) return keyed;
  if (isGroupNode(target)) return null;
  if (isExistingResource(target)) return null;
  return d.canRemoveNode(target) ? null : `${refOf(target)} can't be removed.`;
}

const isExistingResource = (target: Node) =>
  target.type === NodeType.ResourceNode &&
  !target.id.startsWith("resource-new-");

function deleteInDraft(target: Node, d: BridgeDeps): AgentStepResult {
  if (isGroupNode(target)) {
    const group = getNodeGroup(target);
    d.deleteGroup(target);
    return ok(
      isNewGroup(group)
        ? `Removed the draft group “${group?.name}”.`
        : `Marked group “${group?.name}” for deletion.`,
    );
  }
  if (isExistingResource(target)) {
    d.deleteResource(target.id);
    return ok(`Marked ${refOf(target)} for deletion.`);
  }
  d.removeNode(target);
  return ok(`Removed ${refOf(target)} from the draft.`);
}

const isPolicyCard = (node: Node) =>
  node.type === NodeType.PolicyNode || node.type === NodeType.AgentPolicyNode;

type PolicyState = {
  changes: BridgeDeps["changes"];
  canvas: Map<string, CanvasPolicy>;
};

function canvasPolicies(d: BridgeDeps): PolicyState["canvas"] {
  const edges = d.reactFlow.getEdges();
  const found = new Map<string, CanvasPolicy>();
  d.reactFlow.getNodes().forEach((n) => {
    if (n.type === NodeType.PolicyNode) {
      const policy = (n.data as { policy?: Policy })?.policy;
      if (!policy) return;
      found.set(n.id, {
        name: policy.name,
        key: policySidesKey(policy),
        existing: !n.id.startsWith("policy-new-"),
        entity: policyEntityKey("policy", policy.id ?? n.id),
      });
    }
    if (n.type === NodeType.AgentPolicyNode) {
      const data = n.data as { id?: string; name?: string };
      const ends = edges
        .filter((e) => e.source === n.id || e.target === n.id)
        .map((e) => (e.source === n.id ? `>${e.target}` : `<${e.source}`))
        .sort();
      found.set(n.id, {
        name: data?.name ?? "Agent policy",
        key: JSON.stringify(ends),
        existing: !data?.id?.startsWith("new-"),
        entity: policyEntityKey("agent", data?.id ?? n.id),
      });
    }
  });
  return found;
}

const policyState = (d: BridgeDeps): PolicyState => ({
  changes: d.changes,
  canvas: canvasPolicies(d),
});

async function policyFallout(
  before: PolicyState,
  deps: Deps,
): Promise<string> {
  await settle();
  await settle();
  const d = deps();
  const stripped = strippedCanvasPolicies(before.canvas, canvasPolicies(d));
  markByAssistant(
    d,
    stripped.map((p) => p.id),
  );
  return consequencesText(
    policyConsequences(before.changes, d.changes),
    stripped,
  );
}

function markByAssistant(d: BridgeDeps, nodeIds: string[]): string[] {
  const fresh = d.reactFlow
    .getNodes()
    .filter(
      (n) =>
        nodeIds.includes(n.id) &&
        isPolicyCard(n) &&
        !(n.data as { byAssistant?: boolean })?.byAssistant,
    )
    .map((n) => n.id);
  setByAssistant(d, fresh, true);
  return fresh;
}

const unmarkByAssistant = (d: BridgeDeps, nodeIds: string[]) =>
  setByAssistant(d, nodeIds, false);

function setByAssistant(d: BridgeDeps, nodeIds: string[], value: boolean) {
  if (nodeIds.length === 0) return;
  d.reactFlow.setNodes((prev) => {
    const stale = (n: Node) =>
      nodeIds.includes(n.id) &&
      !!(n.data as { byAssistant?: boolean })?.byAssistant !== value;
    if (!prev.some(stale)) return prev;
    return prev.map((n) =>
      stale(n) ? { ...n, data: { ...n.data, byAssistant: value || undefined } } : n,
    );
  });
}

function laneFor(kind: AgentAddItem["kind"], role?: AgentAddItem["role"]): Lane {
  if (kind === "new_policy" || kind === "existing_policy") return "center";
  if (kind === "new_agent_policy" || kind === "existing_agent_policy")
    return "center";
  if (kind === "new_provider" || kind === "existing_provider") return "right";
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

function nextPlacement(
  kind: AgentAddItem["kind"],
  role: AgentAddItem["role"],
  d: BridgeDeps,
): { x: number; y: number; lane: Lane } {
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
    lane,
  };
}

function frameBuildArea(d: BridgeDeps, lane: Lane) {
  if (!placement.anchor) return;
  const at = LANE_X[lane];
  const span = placement.framed;
  if (span && at >= span.min && at <= span.max) return;
  const min = Math.min(at, span?.min ?? at);
  const max = Math.max(at, span?.max ?? at);
  placement.framed = { min, max };
  const { x, y } = placement.anchor;
  void d.reactFlow.fitBounds(
    {
      x: x + min - BUILD_AREA_MARGIN,
      y: y - BUILD_AREA_MARGIN,
      width: max - min + BUILD_AREA_MARGIN * 2 + 300, // plus one node width
      height: BUILD_AREA_HEIGHT,
    },
    { duration: 500 },
  );
}

async function revealNode(nodeId: string, d: BridgeDeps) {
  // React Flow computes fit bounds from measured nodes only, so fitting before
  // the new node is measured leaves it out.
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
  // `||`, not `??`: `Number(undefined)` is NaN, which `??` lets through.
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

// Not `addMemberToGroup`: a user's membership lives on the user (`auto_groups`),
// and that writer silently ignores anything but a peer or resource.
function assignUserToGroup(
  user: { id?: string; name?: string; email?: string; auto_groups?: string[] },
  group: Node,
  d: BridgeDeps,
): AgentStepResult {
  const groupData = getNodeGroup(group);
  const label = user.name || user.email || user.id || "that user";
  if (!user.id) return fail(`${label} has no id to assign.`);

  const ref = groupData?.id || (d.draft.isDraft ? groupData?.name : undefined);
  if (!ref)
    return fail(
      `Can't reference “${groupData?.name ?? "that group"}” for user membership.`,
    );

  // A draft group has no id yet, so the ref above is its name. The changeset
  // wins over `auto_groups`, which misses groups added earlier in this draft.
  const pending = d.changes.find(
    (c) => c.type === "update-user-groups" && c.userId === user.id,
  );
  const current =
    pending?.type === "update-user-groups"
      ? pending.groupRefs
      : (user.auto_groups ?? []);
  if (current.includes(ref)) {
    return ok(
      `${label} is already in “${groupData?.name}” — nothing to change.`,
    );
  }

  d.trackUpdateUserGroups({
    userId: user.id,
    name: label,
    baseGroupRefs: user.auto_groups ?? [],
    groupRefs: [...current, ref],
    addedGroupNames: [groupData?.name ?? ""],
    removedGroupNames: [],
  });
  return ok(`Added the user ${label} to “${groupData?.name}”.`);
}

async function assignEntityToGroup(
  action: AgentNodeAction,
  d: BridgeDeps,
): Promise<AgentStepResult> {
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
    const user = d.data.users?.find((u) => u.id === action.node);
    if (user) return assignUserToGroup(user, group, d);
  }
  if (!peer && !resource) {
    return fail(
      `${action.node} is neither a node on the canvas nor a peer, resource or user in the account.`,
    );
  }

  const itemId = action.node;
  if (groupContainsItem(group, itemId)) {
    return ok(
      `Already in “${getNodeGroup(group)?.name}” — nothing to change.`,
    );
  }

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
    keepFramedCard: true,
  });
  const what = peer ? card?.id ?? action.node : `“${resource?.name}”`;
  let filled: Node | undefined;
  for (let i = 0; i < 20; i++) {
    await settle();
    filled = d.reactFlow.getNodes().find((n) => n.id === group.id);
    if (filled && groupContainsItem(filled, itemId)) break;
    await wait(25);
  }
  if (!filled || !groupContainsItem(filled, itemId)) {
    return fail(
      `${what} did not join “${
        getNodeGroup(group)?.name
      }” — that group doesn't take members this way. Nothing changed.`,
    );
  }
  const note = card ? " — its card is now part of the group" : "";
  return ok(`Added ${what} to “${getNodeGroup(group)?.name}”${note}.`);
}

function groupNameTaken(
  name: string,
  d: BridgeDeps,
  exceptNodeId?: string,
): string | null {
  if (name.trim().toLowerCase() === "all")
    return "“All” is the system group's name and can't be reused.";
  const own = exceptNodeId
    ? getNodeGroup(d.reactFlow.getNodes().find((n) => n.id === exceptNodeId))
    : undefined;
  const ownName = own?.name;
  const clash =
    d.data.groups?.some(
      (g: Group) => g.name === name && !(own?.id && g.id === own.id),
    ) ||
    d.reactFlow
      .getNodes()
      .some((n) => n.id !== exceptNodeId && getNodeGroup(n)?.name === name) ||
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

const policyOn = (nodeId: string, d: BridgeDeps): Policy | undefined =>
  (d.reactFlow.getNodes().find((n) => n.id === nodeId)?.data as { policy?: Policy })?.policy;

const takesPorts = (protocol: string | undefined) =>
  protocol === "tcp" || protocol === "udp";

const portsGiven = (edit: AgentPolicyEdit) =>
  edit.ports !== undefined || edit.portRanges !== undefined;

function editLanded(edit: AgentPolicyEdit, policy: Policy | undefined): boolean {
  const rule = policy?.rules?.[0];
  if (!rule) return false;
  if (edit.protocol !== undefined && rule.protocol !== edit.protocol) return false;
  if (portsGiven(edit) && takesPorts(rule.protocol)) {
    if ((rule.ports ?? []).join(",") !== (edit.ports ?? []).join(",")) return false;
    if (!samePortRanges(rule.port_ranges, edit.portRanges)) return false;
  }
  if (edit.bidirectional !== undefined && rule.bidirectional !== edit.bidirectional) return false;
  return true;
}

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
  const given = portsGiven(edit);
  // The API rejects ports on anything but TCP/UDP, so a switch away clears them.
  const portsAllowed = takesPorts(protocol);
  if (given && !portsAllowed) {
    return fail(
      `Ports need protocol tcp or udp — “${protocol}” takes none. Nothing changed.`,
    );
  }

  let ports: string[] = [];
  let ranges: PortRange[] = [];
  if (portsAllowed) {
    ports = given ? edit.ports ?? [] : rule.ports ?? [];
    ranges = given ? edit.portRanges ?? [] : rule.port_ranges ?? [];
  }

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
        port_ranges: ranges.length > 0 ? ranges : undefined,
        bidirectional: edit.bidirectional ?? rule.bidirectional,
      },
      ...(current.rules?.slice(1) ?? []),
    ],
  };

  d.updateDraftPolicy(next);

  const landed = `${protocol}${portsLabel(ports, ranges)}${
    next.rules?.[0]?.bidirectional ? ", both directions" : ""
  }`;
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
  [NodeType.ProviderNode]: "provider",
  [NodeType.AgentPolicyNode]: "agent-policy",
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
    name?: string;
  };
  return (
    data?.placeholderName ??
    data?.peer?.name ??
    data?.group?.name ??
    data?.policy?.name ??
    data?.network?.name ??
    data?.resource?.name ??
    data?.name ??
    node.id
  );
}

// Peer names must not leave the browser, so a peer is named by its node id,
// which the caller swaps for a token.
function refOf(node: Node): string {
  const kind = KINDS[node.type ?? ""] ?? "other";
  const placeholder = (node.data as { placeholderKind?: string })
    ?.placeholderKind;
  if (kind === "peer" && !placeholder) return node.id;
  return `“${labelOf(node)}”`;
}

function entityOf(node: Node): AgentNode["entity"] {
  // Checked by node type: provider and agent-policy cards keep their record id
  // in `data.id`, which other cards use for something else.
  const type = KINDS[node.type ?? ""] ?? "other";
  if (type === "provider" || type === "agent-policy") {
    const recordId = (node.data as { id?: string })?.id;
    if (!recordId || recordId.startsWith("new-")) return undefined;
    return {
      kind: type === "provider" ? "provider" : "agent_policy",
      id: recordId,
    };
  }
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
    if (id && !id.startsWith("new-")) return { kind, id };
  }
  return undefined;
}

function describeNode(
  node: Node,
  d: BridgeDeps,
  guarded: Set<string>,
): AgentNode {
  const kind = KINDS[node.type ?? ""] ?? "other";
  const placeholder = (
    node.data as { placeholderKind?: AgentNode["placeholder"] }
  )?.placeholderKind;
  const isDraft = d.draft.isDraft;

  return {
    nodeId: node.id,
    kind,
    label: labelOf(node),
    entity: entityOf(node),
    placeholder,
    enabled: (node.data as { enabled?: boolean })?.enabled ?? true,
    parentNodeId: node.parentId,
    frame: isFrameNode(node) || undefined,
    can: {
      rename:
        isDraft &&
        (isGroupNode(node)
          ? !isSystemAllGroup(getNodeGroup(node), d) &&
            canRenameGroup(getNodeGroup(node))
          : !!placeholder ||
            node.id.startsWith("resource-new-") ||
            isDraftNetworkNode(node)),
      remove: isDraft && d.canRemoveNode(node) && !guarded.has(node.id),
      delete: isDraft && deleteRefusal(node, d, guarded) === null,
    },
  };
}

const kindsOf = (from: Node, to: Node) =>
  new Set([from, to].map((n) => KINDS[n.type ?? ""] ?? "other"));

function dialogNote(from: Node, to: Node): string {
  const kinds = kindsOf(from, to);
  if (kinds.has("agent-policy")) {
    return " That agent policy already has a source group and holds exactly one, so a replace confirmation opened for the user to answer.";
  }
  if (kinds.has("provider")) {
    return " There was no agent policy between them, so the agent-policy wizard opened for the user to finish.";
  }
  if (!kinds.has("policy")) {
    return " Neither side is a policy, so the create-policy dialog opened for the user to finish.";
  }
  if (kinds.has("network")) {
    return " A network has several possible destinations, so the picker opened for the user to choose one.";
  }
  return " A dialog opened for the user to finish.";
}

function nothingConnected(from: Node, to: Node, sourceHandle: string): string {
  const policyNode = [to, from].find((n) => n.type === NodeType.PolicyNode);
  if (policyNode) {
    const other = policyNode.id === from.id ? to : from;
    const side = connectSide(policyNode.id === from.id, sourceHandle);
    const policy = (policyNode.data as { policy?: Policy })?.policy;
    return `Nothing was connected: ${refOf(other)} was NOT added to policy ${refOf(
      policyNode,
    )} — ${describePolicySide(policy, side)}. The policy is unchanged.`;
  }
  const kinds = kindsOf(from, to);
  let why = "that pair can't be linked, or it already is";
  if (kinds.has("agent-policy")) {
    why =
      kinds.has("provider") || kinds.has("group")
        ? "the agent policy already has it"
        : "an agent policy only takes a group (source) or a provider (destination)";
  } else if (kinds.has("provider") && !kinds.has("group")) {
    why = "only a group or an agent policy can reach a provider";
  }
  return `Nothing was connected between ${refOf(from)} and ${refOf(
    to,
  )}: ${why}. No dialog opened and nothing changed.`;
}

function connectEvidence(d: BridgeDeps): ConnectEvidence {
  const nodes = d.reactFlow.getNodes().map((n) => {
    const data = n.data as {
      policy?: Policy | AgentPolicy;
      draftNetwork?: unknown;
    };
    const policy = data?.policy;
    let sides: string | null = null;
    if (policy && "rules" in policy) sides = policySidesKey(policy);
    else if (policy) {
      sides = JSON.stringify([
        policy.sourceGroups,
        policy.destinationProviderIds,
      ]);
    }
    return [n.id, n.parentId ?? null, sides, data?.draftNetwork ?? null];
  });
  return {
    edges: new Set(d.reactFlow.getEdges().map((e) => e.id)),
    state: JSON.stringify([nodes, d.changes]),
    dialogs: openDialogCount(),
    picker: !!d.draft.networkDestinationPicker,
  };
}

const openDialogCount = (): number =>
  [
    ...document.querySelectorAll('[role="dialog"], [role="alertdialog"]'),
  ].filter(
    (el) =>
      el.getAttribute("data-state") !== "closed" &&
      !el.closest("[data-assistant-panel], [data-radix-popper-content-wrapper]"),
  ).length;

async function leaveDraft(d: BridgeDeps): Promise<AgentStepResult> {
  const artifacts =
    d.hasPendingArtifacts ||
    d.reactFlow.getNodes().some((n) => holdsSessionArtifacts(n.data));
  if (artifacts && d.changes.length === 0) {
    const agreed = await d.confirm({
      title: "Leave the draft?",
      description:
        "This draft generated setup keys for devices that were not installed yet. Leaving deletes those keys and their temporary groups, so an install command you already copied stops working.",
      confirmText: "Leave draft",
      cancelText: "Stay",
      type: "warning",
    });
    if (!agreed) {
      return fail("The user chose to keep the draft — still in draft mode.");
    }
  }
  const left = await d.discardAndExit();
  return left
    ? ok("Left draft mode; the draft was discarded.")
    : fail("The user chose to keep the draft — still in draft mode.");
}

// The connect rules read the side off the start handle, and silently drop a
// resource or network frame that claims the source (right) side.
function startHandle(from: Node, to: Node): string {
  const kind = KINDS[from.type ?? ""] ?? "other";
  const destinationOnly = kind === "resource" || kind === "network";
  return to.type === NodeType.PolicyNode && destinationOnly
    ? "sl-connect"
    : "sr-connect";
}

const onCanvas = (nodeId: string, d: BridgeDeps): boolean =>
  d.reactFlow.getNodes().some((n) => n.id === nodeId);

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
