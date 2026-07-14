import { createContext, PropsWithChildren, useContext, useState } from "react";

export enum CanvasTool {
  Select = "select",
  Hand = "hand",
}

// Drives the shared "Install NetBird" modal. Opened by dragging a User Device
// template onto the canvas, or by clicking Install on a placeholder peer node.
export type InstallModalState = {
  isUserDevice: boolean;
  setupKey?: string;
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
});

export const useDraftMode = () => useContext(DraftModeContext);

export const DraftModeProvider = ({ children }: PropsWithChildren) => {
  const [isDraft, setIsDraft] = useState(false);
  const [activeTool, setActiveTool] = useState<CanvasTool>(CanvasTool.Hand);
  const [componentsPanelOpen, setComponentsPanelOpen] = useState(false);
  const [installModal, setInstallModal] = useState<InstallModalState | null>(
    null,
  );

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
      }}
    >
      {children}
    </DraftModeContext.Provider>
  );
};
