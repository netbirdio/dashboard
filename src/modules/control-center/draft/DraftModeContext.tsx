import { createContext, PropsWithChildren, useContext, useState } from "react";
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

type DraftModeContextType = {
  isDraft: boolean;
  setIsDraft: (value: boolean) => void;
  activeTool: CanvasTool;
  setActiveTool: (tool: CanvasTool) => void;
  componentsPanelOpen: boolean;
  setComponentsPanelOpen: (value: boolean) => void;
  installModal: InstallModalState | null;
  setInstallModal: (value: InstallModalState | null) => void;
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
  routingPeerModal: { networkNodeId: string } | null;
  setRoutingPeerModal: (value: { networkNodeId: string } | null) => void;
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
  // Frame under the pointer (incl. its children — they're separate canvas
  // nodes, so CSS hover can't span the frame): header, border and resource
  // rows highlight together, like the live card.
  hoveredNetworkNodeId: string | null;
  setHoveredNetworkNodeId: (value: string | null) => void;
  // Bumped by "New Draft" — forces the draft canvas to rebuild from live.
  draftSession: number;
  newDraftSession: () => void;
};

const DraftModeContext = createContext<DraftModeContextType>({
  isDraft: false,
  setIsDraft: () => {},
  activeTool: CanvasTool.Hand,
  setActiveTool: () => {},
  componentsPanelOpen: false,
  setComponentsPanelOpen: () => {},
  installModal: null,
  setInstallModal: () => {},
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
  hoveredNetworkNodeId: null,
  setHoveredNetworkNodeId: () => {},
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
  const [resourceEditor, setResourceEditor] =
    useState<ResourceEditorState | null>(null);
  const [resourceNetworkPicker, setResourceNetworkPicker] = useState<{
    nodeId: string;
  } | null>(null);
  const [routingPeerModal, setRoutingPeerModal] = useState<{
    networkNodeId: string;
  } | null>(null);
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
  const newDraftSession = () => setDraftSession((s) => s + 1);

  return (
    <DraftModeContext.Provider
      value={{
        isDraft,
        setIsDraft,
        activeTool,
        setActiveTool,
        componentsPanelOpen,
        setComponentsPanelOpen,
        installModal,
        setInstallModal,
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
        hoveredNetworkNodeId,
        setHoveredNetworkNodeId,
        draftSession,
        newDraftSession,
      }}
    >
      {children}
    </DraftModeContext.Provider>
  );
};
