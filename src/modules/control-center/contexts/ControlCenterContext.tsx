"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
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
import { FlowView } from "@/modules/control-center/header/FlowSelector";
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
import { DestinationGroupPanel } from "@/modules/control-center/panels/DestinationGroupPanel";
import { PeerGroupsPanel } from "@/modules/control-center/panels/PeerGroupsPanel";
import NetworkResourceModal from "@/modules/networks/resources/NetworkResourceModal";
import { NetworkAccessControlProvider } from "@/modules/networks/NetworkAccessControlProvider";
import { NetworkProvider } from "@/modules/networks/NetworkProvider";
import { mutate } from "swr";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import {
  ensureParentsBeforeChildren,
  getIpPlaceholderFromRange,
} from "@/modules/control-center/utils/helpers";
import { useAccount } from "@/modules/account/useAccount";

interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onNodesChange: OnNodesChange<Node>;
  onEdgesChange: OnEdgesChange<Edge>;
  layoutInitialized: boolean;
  setLayoutInitialized: (v: boolean) => void;
  instantDrill: boolean;
  setInstantDrill: (v: boolean) => void;
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
  // Opens the networks page's resource modal; its save PUTs immediately.
  liveResourceEditor: { resourceId: string; networkId: string } | null;
  setLiveResourceEditor: (
    v: { resourceId: string; networkId: string } | null,
  ) => void;
  contextMenuNodeId: string;
  setContextMenuNodeId: (v: string) => void;
  loggedInUser: User | undefined;
  forceSingleGroupViewRef: React.MutableRefObject<(id: string) => void>;
  // Wired from useSelectNodeHandlers (circular dependency); no-op in draft.
  refreshLiveViewRef: React.MutableRefObject<(policy: Policy) => void>;
}

const CanvasStateContext = createContext<CanvasState | null>(null);

// Not a context: a context value would re-render every reading node on each
// right-click; here a node subscribes to a boolean.
let haloNodeId = "";
const haloListeners = new Set<() => void>();
const haloStore = {
  set(id: string) {
    if (id === haloNodeId) return;
    haloNodeId = id;
    haloListeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    haloListeners.add(l);
    return () => haloListeners.delete(l);
  },
};

export function useIsContextMenuTarget(nodeId: string): boolean {
  return useSyncExternalStore(
    haloStore.subscribe,
    () => haloNodeId === nodeId,
    () => false,
  );
}

// Split from CanvasState so nodes don't subscribe to nodes/edges, which change
// identity on every canvas update.
interface CanvasUIState {
  placeholderIp: string;
}

const CanvasUIContext = createContext<CanvasUIState | null>(null);

// Its own context so opening the group panel doesn't re-render every node.
interface DestinationGroupState {
  selectedDestinationGroup: string;
  setSelectedDestinationGroup: (v: string) => void;
  // Focus target without a panel; the dim hook keys on this or the group above.
  focusedNodeId: string;
  setFocusedNodeId: (v: string) => void;
  // Armed by the "F" key; stays armed so further clicks re-target.
  highlightArmed: boolean;
  setHighlightArmed: (v: boolean) => void;
  // Only one of the two panels shows at a time.
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

  // The canvas lives only in React, so mirror a projection onto window for e2e.
  useEffect(() => {
    if (process.env.APP_ENV !== "test") return;
    (window as unknown as { __ccDraftCanvas?: unknown }).__ccDraftCanvas = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        parentId: n.parentId,
        position: n.position,
        data: n.data,
      })),
    };
  }, [nodes]);

  // applyNodeChanges keeps a reparented child at its old index, which can put
  // it in front of its frame and makes ReactFlow drop the containment.
  const onNodesChange: OnNodesChange<Node> = useCallback(
    (changes) =>
      setNodes((prev) =>
        ensureParentsBeforeChildren(applyNodeChanges(changes, prev)),
      ),
    [setNodes],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [layoutInitialized, setLayoutInitialized] = useState(false);
  const [instantDrill, setInstantDrill] = useState(false);
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
  const [contextMenuNodeId, setContextMenuNodeIdState] = useState("");
  const setContextMenuNodeId = useCallback((v: string) => {
    haloStore.set(v);
    setContextMenuNodeIdState(v);
  }, []);

  const forceSingleGroupViewRef = useRef<(id: string) => void>(() => {});
  const refreshLiveViewRef = useRef<(policy: Policy) => void>(() => {});

  // Read once here (a stable string) instead of in every PeerNode.
  const account = useAccount();
  const placeholderIp = useMemo(
    () => getIpPlaceholderFromRange(account?.settings?.network_range),
    [account?.settings?.network_range],
  );

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
      instantDrill,
      setInstantDrill,
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
      instantDrill,
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
      placeholderIp,
    }),
    [placeholderIp],
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

interface ControlCenterUIContextType {
  networkOptions: SelectOption[];
  currentNetwork: Network | undefined;
  onViewChange: (view: FlowView) => void;
  // Without a targetRect the transition zooms from the viewport center.
  onNetworkSelect: (
    id: string,
    targetRect?: Rect | null,
    instant?: boolean,
  ) => void;
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

  // A mode switch tears down its nodes, so drop panels, selection and focus.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setters are stable, `canvas` re-identifies often
  }, [isDraft]);

  // An open panel belongs to the view just left. Only on the transition IN, so
  // a panel opened inside the network stays.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setters are stable, `canvas` re-identifies often
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

  canvas.forceSingleGroupViewRef.current = handlers.forceSingleGroupView;
  canvas.refreshLiveViewRef.current = handlers.refreshLiveView;

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
          {/* Always mounted: remounting per open rebuilds the full lists. */}
          <DestinationGroupPanel
            groupId={canvas.selectedDestinationGroup}
            onClose={() => canvas.setSelectedDestinationGroup("")}
          />
          <PeerGroupsPanel
            peerId={selectedPeerPanel}
            onClose={() => setSelectedPeerPanel("")}
          />
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
                // The modal reads useNetworksContext, so it crashes without
                // these providers.
                <NetworkAccessControlProvider>
                  <NetworkProvider network={network}>
                    <NetworkResourceModal
                      open={true}
                      setOpen={(open) =>
                        !open && canvas.setLiveResourceEditor(null)
                      }
                      network={network}
                      resource={resource}
                      onUpdated={(r) => {
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
                  </NetworkProvider>
                </NetworkAccessControlProvider>
              );
            })()}
        </div>
      </div>
    </ControlCenterUIContext.Provider>
  );
}
