"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Edge,
  Node,
  OnEdgesChange,
  OnNodesChange,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useSearchParams } from "next/navigation";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { FlowView } from "@/modules/control-center/FlowSelector";
import { User } from "@/interfaces/User";
import { SelectOption } from "@components/select/SelectDropdown";
import { Network } from "@/interfaces/Network";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useGroupView } from "@/modules/control-center/hooks/views/useGroupView";
import { usePeerView } from "@/modules/control-center/hooks/views/usePeerView";
import { useUserView } from "@/modules/control-center/hooks/views/useUserView";
import { useNetworkView } from "@/modules/control-center/hooks/views/useNetworkView";
import { useSelectNodeHandlers } from "@/modules/control-center/hooks/useSelectNodeHandlers";
import { ControlCenterComponentsSidebar } from "@/modules/control-center/draft/ControlCenterComponentsSidebar";
import { DestinationGroupPanel } from "@/modules/control-center/DestinationGroupPanel";

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
  previousSelectedUser: string;
  setPreviousSelectedUser: (v: string) => void;
  selectedDestinationGroup: string;
  setSelectedDestinationGroup: (v: string) => void;
  contextMenuNodeId: string;
  setContextMenuNodeId: (v: string) => void;
  loggedInUser: User | undefined;
  forceSingleGroupViewRef: React.MutableRefObject<(id: string) => void>;
  forceSinglePeerViewRef: React.MutableRefObject<
    (id: string, userId?: string) => void
  >;
}

const CanvasStateContext = createContext<CanvasState | null>(null);

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
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
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
  const [previousSelectedUser, setPreviousSelectedUser] = useState("");
  const [selectedDestinationGroup, setSelectedDestinationGroup] = useState("");
  const [contextMenuNodeId, setContextMenuNodeId] = useState("");

  const forceSingleGroupViewRef = useRef<(id: string) => void>(() => {});
  const forceSinglePeerViewRef = useRef<
    (id: string, userId?: string) => void
  >(() => {});

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
      previousSelectedUser,
      setPreviousSelectedUser,
      selectedDestinationGroup,
      setSelectedDestinationGroup,
      contextMenuNodeId,
      setContextMenuNodeId,
      loggedInUser,
      forceSingleGroupViewRef,
      forceSinglePeerViewRef,
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
      previousSelectedUser,
      selectedDestinationGroup,
      contextMenuNodeId,
      loggedInUser,
    ],
  );

  return (
    <CanvasStateContext.Provider value={value}>
      {children}
    </CanvasStateContext.Provider>
  );
}

// ---- UI Context (for header, empty states, canvas interactions) ----

interface ControlCenterUIContextType {
  networkOptions: SelectOption[];
  currentNetwork: Network | undefined;
  onViewChange: (view: FlowView) => void;
  onNetworkSelect: (id: string) => void;
  onForceSingleUserView: (userId: string) => void;
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
  canvas.forceSinglePeerViewRef.current = handlers.forceSinglePeerView;

  const value = useMemo(
    () => ({
      networkOptions: data.networkOptions,
      currentNetwork: data.networks?.find(
        (n) => n.id === canvas.selectedNetwork,
      ),
      onViewChange: handlers.onViewChange,
      onNetworkSelect: handlers.onNetworkSelect,
      onForceSingleUserView: handlers.forceSingleUserView,
      onNodeClick: handlers.onNodeClick,
    }),
    [
      data.networkOptions,
      data.networks,
      canvas.selectedNetwork,
      handlers.onViewChange,
      handlers.onNetworkSelect,
      handlers.forceSingleUserView,
      handlers.onNodeClick,
    ],
  );

  return (
    <ControlCenterUIContext.Provider value={value}>
      <div className={"relative h-full w-full flex overflow-hidden"}>
        {sidebar}
        <div className={"w-full h-full relative overflow-hidden"}>
          {children}
          {canvas.selectedDestinationGroup && (
            <DestinationGroupPanel
              groupId={canvas.selectedDestinationGroup}
              onClose={() => canvas.setSelectedDestinationGroup("")}
            />
          )}
        </div>
      </div>
    </ControlCenterUIContext.Provider>
  );
}
