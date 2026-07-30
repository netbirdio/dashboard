"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  applyNodeChanges,
  Edge,
  Node,
  OnEdgesChange,
  OnNodesChange,
  useEdgesState,
  useNodesState,
  Rect,
} from "@xyflow/react";
import { useSearchParams } from "next/navigation";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { FlowView } from "@/modules/control-center/FlowSelector";
import { User } from "@/interfaces/User";
import { SelectOption } from "@components/select/SelectDropdown";
import { Network } from "@/interfaces/Network";
import { Policy } from "@/interfaces/Policy";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useGroupView } from "@/modules/control-center/hooks/views/useGroupView";
import { usePeerView } from "@/modules/control-center/hooks/views/usePeerView";
import { useUserView } from "@/modules/control-center/hooks/views/useUserView";
import { useNetworkView } from "@/modules/control-center/hooks/views/useNetworkView";
import { useSelectNodeHandlers } from "@/modules/control-center/hooks/useSelectNodeHandlers";
import { useDraftNodeCreation } from "@/modules/control-center/hooks/useDraftNodeCreation";
import { DestinationGroupPanel } from "@/modules/control-center/DestinationGroupPanel";
import { PeerGroupsPanel } from "@/modules/control-center/PeerGroupsPanel";
import NetworkResourceModal from "@/modules/networks/resources/NetworkResourceModal";
import { mutate } from "swr";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { ensureParentsBeforeChildren } from "@/modules/control-center/utils/helpers";

// ---- Canvas State Context ----

interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onNodesChange: OnNodesChange<Node>;
  onEdgesChange: OnEdgesChange<Edge>;
  layoutInitialized: boolean;
  setLayoutInitialized: (v: boolean) => void;
  currentView: FlowView;
  setCurrentView: (v: FlowView) => void;
  selectedNetwork: string;
  setSelectedNetwork: (v: string) => void;
  selectedGroup: string;
  setSelectedGroup: (v: string) => void;
  selectedPeer: string;
  setSelectedPeer: (v: string) => void;
  selectedUser: string;
  setSelectedUser: (v: string) => void;
  selectedDestinationGroup: string;
  setSelectedDestinationGroup: (v: string) => void;
  // Live-mode resource editor target (real ids) — opens the networks page's
  // resource modal; its save PUTs immediately (behind a warning confirm).
  liveResourceEditor: { resourceId: string; networkId: string } | null;
  setLiveResourceEditor: (
    v: { resourceId: string; networkId: string } | null,
  ) => void;
  contextMenuNodeId: string;
  setContextMenuNodeId: (v: string) => void;
  loggedInUser: User | undefined;
  forceSingleGroupViewRef: React.MutableRefObject<(id: string) => void>;
  // Live policy saves patch the canvas in place from the API response —
  // wired from useSelectNodeHandlers (same circular-dependency ref pattern
  // as the force*ViewRefs). No-op in draft mode.
  refreshLiveViewRef: React.MutableRefObject<(policy: Policy) => void>;
}

const CanvasStateContext = createContext<CanvasState | null>(null);

// Lightweight UI state the NODE COMPONENTS need (context-menu halo, group
// details panel target). Split from CanvasState so nodes don't subscribe to
// the nodes/edges arrays — the full context changes identity on every canvas
// update (drag ticks, layout reconciles) and re-rendered every node on the
// canvas (visible lag with many networks).
interface CanvasUIState {
  contextMenuNodeId: string;
  setContextMenuNodeId: (v: string) => void;
  // Draft frames' "Add Resource" action — wired once from
  // ControlCenterUIProvider (useDraftNodeCreation pulls six SWR
  // subscriptions; mounting it per frame lagged big drafts). Lives HERE
  // (stable context) so the per-frame button doesn't subscribe to nodes.
  addResourceToFrameRef: React.MutableRefObject<(nodeId: string) => void>;
}

const CanvasUIContext = createContext<CanvasUIState | null>(null);

// Group-details selection in its OWN context: it lived in CanvasUIState,
// so clicking a group (opening the panel) re-rendered EVERY node component
// on the canvas — a visible freeze on big canvases. Only GroupNode (its
// highlight) subscribes here.
interface DestinationGroupState {
  selectedDestinationGroup: string;
  setSelectedDestinationGroup: (v: string) => void;
  // Generic focus target (no panel): clicking a peer in the user view
  // focuses its path the same way a group click does — the dim hook keys
  // on either.
  focusedNodeId: string;
  setFocusedNodeId: (v: string) => void;
  // Highlight-Connections tool: armed via the header button (or "H") — the
  // next node click sets focusedNodeId; stays armed so further clicks
  // re-target until the pill's X (or a pane click) exits.
  highlightArmed: boolean;
  setHighlightArmed: (v: boolean) => void;
  // Peer whose groups panel is open (real peer id) — the peer-side twin of
  // selectedDestinationGroup; only one of the two panels shows at a time.
  // Lives here (narrow context) so PeerNode can ring the selected peer
  // without subscribing to CanvasState.
  selectedPeerPanel: string;
  setSelectedPeerPanel: (v: string) => void;
}

const DestinationGroupContext = createContext<DestinationGroupState | null>(
  null,
);

export function useDestinationGroup(): DestinationGroupState {
  const ctx = useContext(DestinationGroupContext);
  if (!ctx) {
    throw new Error(
      "useDestinationGroup must be used within a CanvasStateProvider",
    );
  }
  return ctx;
}

export function useCanvasUI(): CanvasUIState {
  const ctx = useContext(CanvasUIContext);
  if (!ctx) {
    throw new Error("useCanvasUI must be used within a CanvasStateProvider");
  }
  return ctx;
}

export function useCanvasState(): CanvasState {
  const ctx = useContext(CanvasStateContext);
  if (!ctx) {
    throw new Error(
      "useCanvasState must be used within a CanvasStateProvider",
    );
  }
  return ctx;
}

export function CanvasStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [nodes, setNodes] = useNodesState<Node>([]);
  // Controlled-flow change application (what useNodesState's onNodesChange
  // does) PLUS the parents-before-children reconcile: applyNodeChanges keeps
  // replaced nodes at their original index, so a reparent issued through
  // `instance.setNodes` (frame drop adoption, assign-to-network) can leave a
  // child in front of its frame — ReactFlow then drops the containment.
  const onNodesChange: OnNodesChange<Node> = useCallback(
    (changes) =>
      setNodes((prev) =>
        ensureParentsBeforeChildren(applyNodeChanges(changes, prev)),
      ),
    [setNodes],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [layoutInitialized, setLayoutInitialized] = useState(false);
  const { loggedInUser } = useLoggedInUser();

  const queryParams = useSearchParams();
  const queryTab = queryParams.get("tab");
  const initialTab = useMemo(() => {
    if (queryTab === "peers") return FlowView.PEERS;
    if (queryTab === "users") return FlowView.USERS;
    if (queryTab === "groups") return FlowView.GROUPS;
    if (queryTab === "networks") return FlowView.NETWORKS;
    return FlowView.PEERS;
  }, [queryTab]);
  const [currentView, setCurrentView] = useState<FlowView>(initialTab);

  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedPeer, setSelectedPeer] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedDestinationGroup, setSelectedDestinationGroup] = useState("");
  const [selectedPeerPanel, setSelectedPeerPanel] = useState("");
  const [liveResourceEditor, setLiveResourceEditor] = useState<{
    resourceId: string;
    networkId: string;
  } | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState("");
  const [highlightArmed, setHighlightArmed] = useState(false);
  const [contextMenuNodeId, setContextMenuNodeId] = useState("");

  const forceSingleGroupViewRef = useRef<(id: string) => void>(() => {});
  const refreshLiveViewRef = useRef<(policy: Policy) => void>(() => {});
  const addResourceToFrameRef = useRef<(nodeId: string) => void>(() => {});

  const value = useMemo(
    () => ({
      nodes,
      edges,
      setNodes,
      setEdges,
      onNodesChange,
      onEdgesChange,
      layoutInitialized,
      setLayoutInitialized,
      currentView,
      setCurrentView,
      selectedNetwork,
      setSelectedNetwork,
      selectedGroup,
      setSelectedGroup,
      selectedPeer,
      setSelectedPeer,
      selectedUser,
      setSelectedUser,
      selectedDestinationGroup,
      setSelectedDestinationGroup,
      liveResourceEditor,
      setLiveResourceEditor,
      contextMenuNodeId,
      setContextMenuNodeId,
      loggedInUser,
      forceSingleGroupViewRef,
      refreshLiveViewRef,
    }),
    [
      nodes,
      edges,
      setNodes,
      setEdges,
      onNodesChange,
      onEdgesChange,
      layoutInitialized,
      currentView,
      selectedNetwork,
      selectedGroup,
      selectedPeer,
      selectedUser,
      selectedDestinationGroup,
      liveResourceEditor,
      contextMenuNodeId,
      loggedInUser,
    ],
  );

  const uiValue = useMemo(
    () => ({
      contextMenuNodeId,
      setContextMenuNodeId,
      addResourceToFrameRef,
    }),
    [contextMenuNodeId],
  );

  const destinationGroupValue = useMemo(
    () => ({
      selectedDestinationGroup,
      setSelectedDestinationGroup,
      focusedNodeId,
      setFocusedNodeId,
      highlightArmed,
      setHighlightArmed,
      selectedPeerPanel,
      setSelectedPeerPanel,
    }),
    [selectedDestinationGroup, focusedNodeId, highlightArmed, selectedPeerPanel],
  );

  return (
    <CanvasStateContext.Provider value={value}>
      <CanvasUIContext.Provider value={uiValue}>
        <DestinationGroupContext.Provider value={destinationGroupValue}>
          {children}
        </DestinationGroupContext.Provider>
      </CanvasUIContext.Provider>
    </CanvasStateContext.Provider>
  );
}

// ---- UI Context (for header, empty states, canvas interactions) ----

interface ControlCenterUIContextType {
  networkOptions: SelectOption[];
  currentNetwork: Network | undefined;
  onViewChange: (view: FlowView) => void;
  // targetRect: the clicked frame's rect — the canvas transition dives into
  // it; without one (dropdown/back picks) it zooms from the viewport center.
  onNetworkSelect: (id: string, targetRect?: Rect | null) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
}

const ControlCenterUIContext =
  createContext<ControlCenterUIContextType | null>(null);

export function useControlCenterUI(): ControlCenterUIContextType {
  const ctx = useContext(ControlCenterUIContext);
  if (!ctx) {
    throw new Error(
      "useControlCenterUI must be used within a ControlCenterUIProvider",
    );
  }
  return ctx;
}

export function ControlCenterUIProvider({
  sidebar,
  children,
}: {
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}) {
  const canvas = useCanvasState();
  const data = useControlCenterData();
  const { isDraft, drillDownNetworkNodeId } = useDraftMode();
  const {
    setFocusedNodeId,
    setHighlightArmed,
    selectedPeerPanel,
    setSelectedPeerPanel,
  } = useDestinationGroup();

  // Mode switches (draft ⇄ live) close the group panel and drop any node
  // selection/focus — both reference nodes of the mode being torn down.
  const prevDraftRef = useRef(isDraft);
  useEffect(() => {
    if (prevDraftRef.current === isDraft) return;
    prevDraftRef.current = isDraft;
    canvas.setSelectedDestinationGroup("");
    setSelectedPeerPanel("");
    setFocusedNodeId("");
    setHighlightArmed(false);
    canvas.setNodes((prev) =>
      prev.some((n) => n.selected)
        ? prev.map((n) => (n.selected ? { ...n, selected: false } : n))
        : prev,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraft]);

  // Entering a network — drilling into a frame (draft) or the single-network
  // view (live) — closes any open group/peer panel: it belongs to the view
  // just left. Only on the transition IN, so a panel opened while inside a
  // network isn't force-closed.
  const enteredNetwork = isDraft
    ? !!drillDownNetworkNodeId
    : !!canvas.selectedNetwork;
  const prevEnteredRef = useRef(enteredNetwork);
  useEffect(() => {
    const wasEntered = prevEnteredRef.current;
    prevEnteredRef.current = enteredNetwork;
    if (enteredNetwork && !wasEntered) {
      canvas.setSelectedDestinationGroup("");
      setSelectedPeerPanel("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enteredNetwork]);

  const { applySingleGroupView } = useGroupView();
  const { applyPeerView } = usePeerView();
  const { applyUserView } = useUserView();
  const { applySingleNetworkView, applyNetworksView } = useNetworkView();

  const handlers = useSelectNodeHandlers({
    views: {
      applySingleGroupView,
      applyPeerView,
      applyUserView,
      applySingleNetworkView,
      applyNetworksView,
    },
  });

  // Wire up circular dependency refs
  canvas.forceSingleGroupViewRef.current = handlers.forceSingleGroupView;
  canvas.refreshLiveViewRef.current = handlers.refreshLiveView;
  const { addResourceToFrame } = useDraftNodeCreation();
  useCanvasUI().addResourceToFrameRef.current = addResourceToFrame;

  const value = useMemo(
    () => ({
      networkOptions: data.networkOptions,
      currentNetwork: data.networks?.find(
        (n) => n.id === canvas.selectedNetwork,
      ),
      onViewChange: handlers.onViewChange,
      onNetworkSelect: handlers.onNetworkSelect,
      onNodeClick: handlers.onNodeClick,
    }),
    [
      data.networkOptions,
      data.networks,
      canvas.selectedNetwork,
      handlers.onViewChange,
      handlers.onNetworkSelect,
      handlers.onNodeClick,
    ],
  );

  return (
    <ControlCenterUIContext.Provider value={value}>
      <div className={"relative h-full w-full flex overflow-hidden"}>
        {sidebar}
        <div className={"w-full h-full relative overflow-hidden"}>
          {children}
          {/* Always mounted (renders null while closed) — remounting per
              open rebuilt the full peer/resource lists every time. */}
          <DestinationGroupPanel
            groupId={canvas.selectedDestinationGroup}
            onClose={() => canvas.setSelectedDestinationGroup("")}
          />
          <PeerGroupsPanel
            peerId={selectedPeerPanel}
            onClose={() => setSelectedPeerPanel("")}
          />
          {/* Live resource editor — the networks page's modal, PUTs on
              save. The canvas node is patched from the response. */}
          {canvas.liveResourceEditor &&
            (() => {
              const network = data.networks?.find(
                (n) => n.id === canvas.liveResourceEditor?.networkId,
              );
              const resource = data.networkResources?.find(
                (r) => r.id === canvas.liveResourceEditor?.resourceId,
              );
              if (!network || !resource) return null;
              return (
                <NetworkResourceModal
                  open={true}
                  setOpen={(open) =>
                    !open && canvas.setLiveResourceEditor(null)
                  }
                  network={network}
                  resource={resource}
                  onUpdated={(r) => {
                    // Patch every canvas node carrying this resource.
                    canvas.setNodes((prev) =>
                      prev.map((n) => {
                        const res = n.data?.resource as
                          | { id?: string }
                          | undefined;
                        if (!res || res.id !== r.id) return n;
                        return {
                          ...n,
                          data: {
                            ...n.data,
                            resource: r,
                            enabled: r.enabled !== false,
                          },
                        };
                      }),
                    );
                    void mutate("/networks/resources");
                    void mutate("/groups");
                    canvas.setLiveResourceEditor(null);
                  }}
                />
              );
            })()}
        </div>
      </div>
    </ControlCenterUIContext.Provider>
  );
}
