import * as React from "react";
import { useEffect } from "react";
import { cn } from "@utils/helpers";
import {
  ArrowBigUpIcon,
  CommandIcon,
  FullscreenIcon,
  HandIcon,
  MinusIcon,
  MousePointer2Icon,
  NetworkIcon,
  PlusIcon,
  Redo2Icon,
  Undo2Icon,
} from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import {
  CanvasTool,
  useDraftMode,
} from "@/modules/control-center/draft/DraftModeContext";
import { useDraftHistory } from "@/modules/control-center/draft/DraftHistoryContext";
import { DEFAULT_MIN_ZOOM } from "@/modules/control-center/utils/layouts";
import { applyDraftBuildLayout } from "@/modules/control-center/utils/draft-build-layout";
import {
  applyDrilledLayout,
  getDrilledFrameAnchor,
} from "@/modules/control-center/utils/drilled-layout";
import { isMac } from "@hooks/useOperatingSystem";

// The big-arrow icon stands in for Shift in the shortcut badges.
const UndoShortcut = isMac ? (
  <span className="flex items-center gap-0.5">
    <CommandIcon size={10} className="relative -top-[1px]" />Z
  </span>
) : (
  <span className="flex items-center gap-0.5">
    Ctrl<span>+</span>Z
  </span>
);

const RedoShortcut = isMac ? (
  <span className="flex items-center gap-0.5">
    <ArrowBigUpIcon size={12} className="relative -top-[1px]" />
    <CommandIcon size={10} className="relative -top-[1px]" />Z
  </span>
) : (
  <span className="flex items-center gap-0.5">
    Ctrl<span>+</span>
    <ArrowBigUpIcon size={12} className="relative -top-[1px]" />
    <span>+</span>Z
  </span>
);
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
    drillDownNetworkNodeId,
  } = useDraftMode();
  const reactFlow = useReactFlow();
  const { undo, redo, canUndo, canRedo } = useDraftHistory();

  const handleZoomIn = () => reactFlow.zoomIn({ duration: 200 });
  const handleZoomOut = () => reactFlow.zoomOut({ duration: 200 });
  const handleFitView = () =>
    reactFlow.fitView({ padding: 0.1, duration: 500, maxZoom: 0.8 });

  // Reads and writes through the ReactFlow instance, never useCanvasState: that
  // context changes identity on every nodes update and re-renders the toolbar.
  const handleArrange = () => {
    const nodes = reactFlow.getNodes();
    const edges = reactFlow.getEdges();
    if (nodes.length === 0) return;

    const refit = (arranged: typeof nodes) => {
      setTimeout(() => {
        reactFlow.fitView({
          nodes: arranged.filter((n) => !n.hidden),
          padding: 0.1,
          duration: 500,
          maxZoom: 0.8,
          minZoom: DEFAULT_MIN_ZOOM,
        });
      }, 50);
    };

    // The frame is re-anchored so the resource grid lands on the layout's
    // resource column, as in useNetworkDrillDown.
    if (drillDownNetworkNodeId) {
      const frameId = drillDownNetworkNodeId;
      const keptTop = nodes
        .filter((n) => !n.hidden && !n.parentId)
        .map((n) => ({ ...n }));
      const keptIds = new Set(keptTop.map((n) => n.id));
      const keptEdges = edges.filter(
        (e) => keptIds.has(e.source) && keptIds.has(e.target),
      );
      const { updatedNodes } = applyDrilledLayout(keptTop, keptEdges);
      const drilledPos = new Map(updatedNodes.map((n) => [n.id, n.position]));
      const childCount = nodes.filter((n) => n.parentId === frameId).length;
      drilledPos.set(frameId, getDrilledFrameAnchor(childCount));
      const arranged = nodes.map((n) => {
        const position = drilledPos.get(n.id);
        return position ? { ...n, position } : n;
      });
      reactFlow.setNodes(arranged);
      refit(arranged);
      return;
    }

    const { updatedNodes, updatedEdges } = applyDraftBuildLayout(nodes, edges);
    reactFlow.setNodes(updatedNodes);
    reactFlow.setEdges(updatedEdges);
    refit(updatedNodes);
  };

  useControlCenterShortcuts({
    c: () => setComponentsPanelOpen(!componentsPanelOpen),
    v: () => setActiveTool(CanvasTool.Select),
    h: () => setActiveTool(CanvasTool.Hand),
    "1": handleFitView,
    a: handleArrange,
    "+": handleZoomIn,
    "-": handleZoomOut,
  });

  // Spacebar hold-to-pan needs keyup, so it is handled separately.
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
          data-testid="cc-toolbar-add"
          shortcut="C"
          variant="primary"
          active={componentsPanelOpen}
          onClick={() => setComponentsPanelOpen(!componentsPanelOpen)}
          className="pl-2 pr-2.5 gap-1 text-sm group/add"
        >
          <PlusIcon
            size={13}
            className={cn(
              "transition-transform duration-300",
              "group-hover/add:rotate-90",
            )}
          />
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
        <ToolbarButton
          disabled={!canUndo}
          tooltip="Undo"
          data-testid="cc-toolbar-undo"
          shortcut={UndoShortcut}
          onClick={undo}
          className="w-8"
        >
          <Undo2Icon size={14} />
        </ToolbarButton>
        <ToolbarButton
          disabled={!canRedo}
          tooltip="Redo"
          data-testid="cc-toolbar-redo"
          shortcut={RedoShortcut}
          onClick={redo}
          className="w-8"
        >
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
          data-testid="cc-toolbar-fit"
          shortcut="1"
          onClick={handleFitView}
          className="w-8"
        >
          <FullscreenIcon size={14} />
        </ToolbarButton>
        <ToolbarButton
          tooltip="Auto Arrange"
          data-testid="cc-toolbar-arrange"
          shortcut="A"
          onClick={handleArrange}
          className="w-8"
        >
          <NetworkIcon size={14} className="-rotate-90" />
        </ToolbarButton>
      </ToolbarGroup>
    </ToolbarContainer>
  );
};
