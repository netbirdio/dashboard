import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { Network, NetworkRouter } from "@/interfaces/Network";
import type { PeerPlaceholderKind } from "@/modules/control-center/nodes/PeerNode";

export enum CanvasTool {
  Select = "select",
  Hand = "hand",
}

// Drives the shared "Install NetBird" modal. Opened by dragging a User Device
// template onto the canvas, or by clicking Install on a placeholder peer node.
// Placeholder installs carry their kind (agent keys are ephemeral) and node id
// so a key generated inside the modal can be held on the node for reuse.
export type InstallModalState = {
  isUserDevice: boolean;
  setupKey?: string;
  placeholderKind?: PeerPlaceholderKind;
  nodeId?: string;
};

// Minimal destination picker — a POLICY dragged onto a network frame (or
// the frame's connector onto a policy) picks that policy's destination from
// the network's resources/resource-groups. Peer/group drags open the
// create-policy modal instead.
export type NetworkDestinationPickerState = {
  networkNodeId: string;
  policyNodeId: string;
};

export type ResourceEditorState =
  | { nodeId: string; createInNetworkNodeId?: never }
  | { nodeId?: never; createInNetworkNodeId: string };

// Routing-peer modal target: a network frame (or a direct network, for the
// live header where no frame node exists). editChangeId opens an existing
// create-router change to EDIT (the save replaces it); router opens an API
// router in the real modal (its save PUTs via the API).
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
  // User-device setup stepper (install NetBird → select the registered
  // peer). Opened from the placeholder node or a group-panel row; nodeId is
  // the placeholder's canvas id (peer-draft-…), name its canvas label.
  userDeviceModal: { nodeId: string; name: string } | null;
  setUserDeviceModal: (value: { nodeId: string; name: string } | null) => void;
  // Draft resource editor (pure-data modal) — edits an existing resource
  // node, OR creates a new one into a frame (the frame header's "Add
  // Resource" button / context menu).
  resourceEditor: ResourceEditorState | null;
  setResourceEditor: (value: ResourceEditorState | null) => void;
  // "No Network" picker for a standalone draft resource — pick an existing
  // network or create a new one to assign the resource to.
  resourceNetworkPicker: { nodeId: string } | null;
  setResourceNetworkPicker: (value: { nodeId: string } | null) => void;
  // Draft routing-peer modal (networks page modal, pure-data) — targets a
  // network frame.
  routingPeerModal: RoutingPeerModalState | null;
  setRoutingPeerModal: (value: RoutingPeerModalState | null) => void;
  networkDestinationPicker: NetworkDestinationPickerState | null;
  setNetworkDestinationPicker: (
    value: NetworkDestinationPickerState | null,
  ) => void;
  // Draft network editor (networks page's modal, pure-data) — name +
  // description of a draft network frame.
  networkEditor: { networkNodeId: string } | null;
  setNetworkEditor: (value: { networkNodeId: string } | null) => void;
  // Drilled-into network frame (single-network draft view) — framed
  // resources only expose connect handles while their frame is drilled.
  drillDownNetworkNodeId: string | null;
  setDrillDownNetworkNodeId: (value: string | null) => void;
  // Bumped by "New Draft" — forces the draft canvas to rebuild from live.
  draftSession: number;
  newDraftSession: () => void;
};

// Frame under the pointer (incl. its children — they're separate canvas
// nodes, so CSS hover can't span the frame): header, border and resource
// rows highlight together, like the live card. Lives in its OWN context —
// hover flips on every mouse move across nodes, and putting it on the main
// draft context re-rendered every node component on the canvas (visible lag
// with many networks). Only NetworkNode and the canvas subscribe here.
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

  const hoverValue = useMemo(
    () => ({ hoveredNetworkNodeId, setHoveredNetworkNodeId }),
    [hoveredNetworkNodeId],
  );

  // MEMOIZED — an unmemoized value re-rendered EVERY useDraftMode consumer
  // (every node component) whenever ANY provider state changed; hover flips
  // (which fire on every node mouse enter/leave, live mode included) made
  // whole-tree ~2700-fiber User-Blocking commits of 100ms+ per flip.
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
