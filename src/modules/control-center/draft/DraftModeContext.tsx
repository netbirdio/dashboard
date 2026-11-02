import {
  createContext,
  MutableRefObject,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { XYPosition } from "@xyflow/react";
import type { Network, NetworkRouter } from "@/interfaces/Network";
import type { PeerPlaceholderKind } from "@/modules/control-center/nodes/PeerNode";

export enum CanvasTool {
  Select = "select",
  Hand = "hand",
}

// nodeId lets a key generated in the modal be held on the node for reuse.
export type InstallModalState = {
  isUserDevice: boolean;
  setupKey?: string;
  placeholderKind?: PeerPlaceholderKind;
  nodeId?: string;
};

// A policy dropped on a network frame picks its destination from that network.
export type NetworkDestinationPickerState = {
  networkNodeId: string;
  policyNodeId: string;
};

// The create shapes defer node creation to the modal's save.
export type ResourceEditorState =
  | { nodeId: string; createInNetworkNodeId?: never; createStandaloneAt?: never }
  | {
      nodeId?: never;
      createInNetworkNodeId: string;
      createAt?: XYPosition | null;
      createStandaloneAt?: never;
    }
  | {
      nodeId?: never;
      createInNetworkNodeId?: never;
      createStandaloneAt: XYPosition | null;
    };

// editChangeId replaces a pending create-router change; router edits a live one.
export type RoutingPeerModalState = {
  networkNodeId?: string;
  network?: Network;
  editChangeId?: string;
  router?: NetworkRouter;
};

type DraftModeContextType = {
  isDraft: boolean;
  setIsDraft: (value: boolean) => void;
  activeTool: CanvasTool;
  setActiveTool: (tool: CanvasTool) => void;
  componentsPanelOpen: boolean;
  setComponentsPanelOpen: (value: boolean) => void;
  installModal: InstallModalState | null;
  setInstallModal: (value: InstallModalState | null) => void;
  userDeviceModal: { nodeId: string; name: string } | null;
  setUserDeviceModal: (value: { nodeId: string; name: string } | null) => void;
  // Every added resource goes through this modal so its address is set up front.
  resourceEditor: ResourceEditorState | null;
  setResourceEditor: (value: ResourceEditorState | null) => void;
  resourceNetworkPicker: { nodeId: string } | null;
  setResourceNetworkPicker: (value: { nodeId: string } | null) => void;
  routingPeerModal: RoutingPeerModalState | null;
  setRoutingPeerModal: (value: RoutingPeerModalState | null) => void;
  networkDestinationPicker: NetworkDestinationPickerState | null;
  setNetworkDestinationPicker: (
    value: NetworkDestinationPickerState | null,
  ) => void;
  networkEditor: { networkNodeId: string } | null;
  setNetworkEditor: (value: { networkNodeId: string } | null) => void;
  // Framed resources only expose connect handles while their frame is drilled.
  drillDownNetworkNodeId: string | null;
  setDrillDownNetworkNodeId: (value: string | null) => void;
  // Bumped by "New Draft" to force the canvas to rebuild from live.
  draftSession: number;
  newDraftSession: () => void;
  startBlankDraft: () => void;
  startCurrentDraft: () => void;
  blankDraftRef: MutableRefObject<boolean>;
  // Suppresses the empty-canvas start screen for a blank draft's lifetime.
  startedBlank: boolean;
};

// Frame children are separate canvas nodes, so CSS hover can't span the frame.
// Its own context because hover flips on every mouse move across nodes.
type NetworkHoverContextType = {
  hoveredNetworkNodeId: string | null;
  setHoveredNetworkNodeId: (value: string | null) => void;
};

const NetworkHoverContext = createContext<NetworkHoverContextType>({
  hoveredNetworkNodeId: null,
  setHoveredNetworkNodeId: () => {},
});

export const useNetworkHover = () => useContext(NetworkHoverContext);

const DraftModeContext = createContext<DraftModeContextType>({
  isDraft: false,
  setIsDraft: () => {},
  activeTool: CanvasTool.Hand,
  setActiveTool: () => {},
  componentsPanelOpen: false,
  setComponentsPanelOpen: () => {},
  installModal: null,
  setInstallModal: () => {},
  userDeviceModal: null,
  setUserDeviceModal: () => {},
  resourceEditor: null,
  setResourceEditor: () => {},
  resourceNetworkPicker: null,
  setResourceNetworkPicker: () => {},
  routingPeerModal: null,
  setRoutingPeerModal: () => {},
  networkDestinationPicker: null,
  setNetworkDestinationPicker: () => {},
  networkEditor: null,
  setNetworkEditor: () => {},
  drillDownNetworkNodeId: null,
  setDrillDownNetworkNodeId: () => {},
  draftSession: 0,
  newDraftSession: () => {},
  startBlankDraft: () => {},
  startCurrentDraft: () => {},
  blankDraftRef: { current: false },
  startedBlank: false,
});

export const useDraftMode = () => useContext(DraftModeContext);

export const DraftModeProvider = ({ children }: PropsWithChildren) => {
  const [isDraft, setIsDraft] = useState(false);
  const [activeTool, setActiveTool] = useState<CanvasTool>(CanvasTool.Hand);
  const [componentsPanelOpen, setComponentsPanelOpen] = useState(false);
  const [installModal, setInstallModal] = useState<InstallModalState | null>(
    null,
  );
  const [userDeviceModal, setUserDeviceModal] = useState<{
    nodeId: string;
    name: string;
  } | null>(null);
  const [resourceEditor, setResourceEditor] =
    useState<ResourceEditorState | null>(null);
  const [resourceNetworkPicker, setResourceNetworkPicker] = useState<{
    nodeId: string;
  } | null>(null);
  const [routingPeerModal, setRoutingPeerModal] =
    useState<RoutingPeerModalState | null>(null);
  const [networkDestinationPicker, setNetworkDestinationPicker] =
    useState<NetworkDestinationPickerState | null>(null);
  const [networkEditor, setNetworkEditor] = useState<{
    networkNodeId: string;
  } | null>(null);
  const [drillDownNetworkNodeId, setDrillDownNetworkNodeId] = useState<
    string | null
  >(null);
  const [hoveredNetworkNodeId, setHoveredNetworkNodeId] = useState<
    string | null
  >(null);
  const [draftSession, setDraftSession] = useState(0);
  const newDraftSession = useCallback(() => setDraftSession((s) => s + 1), []);

  const [startedBlank, setStartedBlank] = useState(false);

  // A ref, not state, so flipping it never re-renders the consumer tree.
  const blankDraftRef = useRef(false);
  const startBlankDraft = useCallback(() => {
    blankDraftRef.current = true;
    setStartedBlank(true);
    setIsDraft(true);
  }, []);
  const startCurrentDraft = useCallback(() => {
    setStartedBlank(false);
    setIsDraft(true);
  }, []);

  const hoverValue = useMemo(
    () => ({ hoveredNetworkNodeId, setHoveredNetworkNodeId }),
    [hoveredNetworkNodeId],
  );

  // Unmemoized, this re-renders every useDraftMode consumer on any state change.
  const value = useMemo(
    () => ({
      isDraft,
      setIsDraft,
      activeTool,
      setActiveTool,
      componentsPanelOpen,
      setComponentsPanelOpen,
      installModal,
      setInstallModal,
      userDeviceModal,
      setUserDeviceModal,
      resourceEditor,
      setResourceEditor,
      resourceNetworkPicker,
      setResourceNetworkPicker,
      routingPeerModal,
      setRoutingPeerModal,
      networkDestinationPicker,
      setNetworkDestinationPicker,
      networkEditor,
      setNetworkEditor,
      drillDownNetworkNodeId,
      setDrillDownNetworkNodeId,
      draftSession,
      newDraftSession,
      startBlankDraft,
      startCurrentDraft,
      blankDraftRef,
      startedBlank,
    }),
    [
      isDraft,
      activeTool,
      componentsPanelOpen,
      installModal,
      userDeviceModal,
      resourceEditor,
      resourceNetworkPicker,
      routingPeerModal,
      networkDestinationPicker,
      networkEditor,
      drillDownNetworkNodeId,
      draftSession,
      newDraftSession,
      startBlankDraft,
      startCurrentDraft,
      startedBlank,
    ],
  );

  return (
    <DraftModeContext.Provider value={value}>
      <NetworkHoverContext.Provider value={hoverValue}>
        {children}
      </NetworkHoverContext.Provider>
    </DraftModeContext.Provider>
  );
};
