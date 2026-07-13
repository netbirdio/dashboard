import * as React from "react";
import { useEffect } from "react";
import {
  FullscreenIcon,
  HandIcon,
  MinusIcon,
  MousePointer2Icon,
  PlusIcon,
  Redo2Icon,
  Undo2Icon,
} from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import {
  CanvasTool,
  useDraftMode,
} from "@/modules/control-center/draft/DraftModeContext";
import {
  isInputFocused,
  useControlCenterShortcuts,
} from "@/modules/control-center/hooks/useControlCenterShortcuts";
import { ToolbarButton } from "@/modules/control-center/toolbar/ToolbarButton";
import { ToolbarContainer } from "@/modules/control-center/toolbar/ToolbarContainer";
import { ToolbarDivider } from "@/modules/control-center/toolbar/ToolbarDivider";
import { ToolbarGroup } from "@/modules/control-center/toolbar/ToolbarGroup";

export const CanvasToolbar = () => {
  const {
    isDraft,
    activeTool,
    setActiveTool,
    componentsPanelOpen,
    setComponentsPanelOpen,
  } = useDraftMode();
  const reactFlow = useReactFlow();

  const handleZoomIn = () => reactFlow.zoomIn({ duration: 200 });
  const handleZoomOut = () => reactFlow.zoomOut({ duration: 200 });
  const handleFitView = () =>
    reactFlow.fitView({ padding: 0.1, duration: 500, maxZoom: 0.8 });

  useControlCenterShortcuts({
    c: () => setComponentsPanelOpen(!componentsPanelOpen),
    v: () => setActiveTool(CanvasTool.Select),
    h: () => setActiveTool(CanvasTool.Hand),
    f: handleFitView,
    "+": handleZoomIn,
    "-": handleZoomOut,
  });

  // Spacebar hold-to-pan (needs keyup, so handled separately)
  const toolBeforeSpaceRef = React.useRef<CanvasTool | null>(null);

  useEffect(() => {
    if (!isDraft) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== " " || isInputFocused()) return;
      e.preventDefault();
      if (activeTool !== CanvasTool.Hand && !toolBeforeSpaceRef.current) {
        toolBeforeSpaceRef.current = activeTool;
        setActiveTool(CanvasTool.Hand);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === " " && toolBeforeSpaceRef.current) {
        setActiveTool(toolBeforeSpaceRef.current);
        toolBeforeSpaceRef.current = null;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isDraft, activeTool, setActiveTool]);

  return (
    <ToolbarContainer>
      <ToolbarGroup position="first" className="pl-2 py-1.5">
        <ToolbarButton
          tooltip="Add Components"
          shortcut="C"
          variant="primary"
          active={componentsPanelOpen}
          onClick={() => setComponentsPanelOpen(!componentsPanelOpen)}
          className="pl-2 pr-2.5 gap-1 text-sm"
        >
          <PlusIcon size={13} />
          Add
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider className="ml-2 mr-2" />

      <ToolbarGroup position="middle">
        <ToolbarButton
          tooltip="Select Tool"
          shortcut="V"
          active={activeTool === CanvasTool.Select}
          onClick={() => setActiveTool(CanvasTool.Select)}
          className="w-8"
        >
          <MousePointer2Icon size={16} />
        </ToolbarButton>
        <ToolbarButton
          tooltip="Hand Tool"
          shortcut="H"
          active={activeTool === CanvasTool.Hand}
          onClick={() => setActiveTool(CanvasTool.Hand)}
          className="w-8"
        >
          <HandIcon size={16} />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider className="ml-3 mr-2" />

      <ToolbarGroup compact position="middle">
        <ToolbarButton disabled tooltip="Undo" className="w-8">
          <Undo2Icon size={14} />
        </ToolbarButton>
        <ToolbarButton disabled tooltip="Redo" className="w-8">
          <Redo2Icon size={14} />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup compact position="last">
        <ToolbarButton
          tooltip="Zoom In"
          shortcut="+"
          onClick={handleZoomIn}
          className="w-8"
        >
          <PlusIcon size={14} />
        </ToolbarButton>
        <ToolbarButton
          tooltip="Zoom Out"
          shortcut="-"
          onClick={handleZoomOut}
          className="w-8"
        >
          <MinusIcon size={14} />
        </ToolbarButton>
        <ToolbarButton
          tooltip="Fit to View"
          shortcut="F"
          onClick={handleFitView}
          className="w-8"
        >
          <FullscreenIcon size={14} />
        </ToolbarButton>
      </ToolbarGroup>
    </ToolbarContainer>
  );
};
