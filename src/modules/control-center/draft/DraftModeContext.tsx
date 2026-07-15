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

type DraftModeContextType = {
  isDraft: boolean;
  setIsDraft: (value: boolean) => void;
  activeTool: CanvasTool;
  setActiveTool: (tool: CanvasTool) => void;
  componentsPanelOpen: boolean;
  setComponentsPanelOpen: (value: boolean) => void;
  installModal: InstallModalState | null;
  setInstallModal: (value: InstallModalState | null) => void;
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
        draftSession,
        newDraftSession,
      }}
    >
      {children}
    </DraftModeContext.Provider>
  );
};
