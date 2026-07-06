import { createContext, PropsWithChildren, useContext, useState } from "react";

export enum CanvasTool {
  Select = "select",
  Hand = "hand",
}

type DraftModeContextType = {
  isDraft: boolean;
  setIsDraft: (value: boolean) => void;
  activeTool: CanvasTool;
  setActiveTool: (tool: CanvasTool) => void;
};

const DraftModeContext = createContext<DraftModeContextType>({
  isDraft: false,
  setIsDraft: () => {},
  activeTool: CanvasTool.Hand,
  setActiveTool: () => {},
});

export const useDraftMode = () => useContext(DraftModeContext);

export const DraftModeProvider = ({ children }: PropsWithChildren) => {
  const [isDraft, setIsDraft] = useState(false);
  const [activeTool, setActiveTool] = useState<CanvasTool>(CanvasTool.Hand);
  return (
    <DraftModeContext.Provider
      value={{ isDraft, setIsDraft, activeTool, setActiveTool }}
    >
      {children}
    </DraftModeContext.Provider>
  );
};
