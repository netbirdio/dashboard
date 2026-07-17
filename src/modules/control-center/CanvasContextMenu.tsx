import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BotIcon,
  FolderGit2,
  WorkflowIcon,
  MonitorSmartphoneIcon,
  NetworkIcon,
  OptionIcon,
  ServerIcon,
  ShieldIcon,
} from "lucide-react";
import { useReactFlow, XYPosition } from "@xyflow/react";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftGroupActions } from "@/modules/control-center/hooks/useDraftGroupActions";
import { useDraftNodeCreation } from "@/modules/control-center/hooks/useDraftNodeCreation";
import { useControlCenterShortcuts } from "@/modules/control-center/hooks/useControlCenterShortcuts";
import { useEdgeAwareMenuPosition } from "@/modules/control-center/hooks/useEdgeAwareMenuPosition";
import { isMac } from "@hooks/useOperatingSystem";

type MenuPosition = {
  x: number;
  y: number;
};

// Shortcut badges: ⌥ icon on macOS, "Alt" text elsewhere (Ctrl+digit is
// reserved for tab switching on Windows/Linux browsers).
const shortcutLabel = (n: number): React.ReactNode =>
  isMac ? (
    <span className={"flex items-center gap-0.5"}>
      <OptionIcon size={11} className={"relative -top-[0.5px]"} />
      {n}
    </span>
  ) : (
    <span className={"flex items-center gap-0.5"}>
      Alt<span>+</span>
      {n}
    </span>
  );

interface CanvasContextMenuProps {
  onOpenChange?: (open: boolean) => void;
}

export const CanvasContextMenu = ({ onOpenChange }: CanvasContextMenuProps) => {
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Where the menu renders — flipped/clamped away from the viewport edges.
  // `position` stays the raw click point so actions create nodes there.
  const menuPosition = useEdgeAwareMenuPosition(position, menuRef);
  const reactFlow = useReactFlow();
  const { isDraft, setComponentsPanelOpen } = useDraftMode();
  const { addNewGroup } = useDraftGroupActions();
  const { addPeerPlaceholder, addBlankNode, addBlankPolicy } =
    useDraftNodeCreation();

  // ---- Draft mode actions ----

  // Same "New …" set as the components picker, grouped with separators:
  // peers · group/policy · network/resource. Each action takes the flow
  // position it should create at (right-click point or viewport center).
  const draftItemGroups: {
    label: string;
    icon: React.ReactNode;
    shortcut: React.ReactNode;
    action: (pos: XYPosition) => void;
  }[][] = useMemo(
    () => [
      [
        {
          label: "New User Device",
          icon: <MonitorSmartphoneIcon size={14} />,
          shortcut: shortcutLabel(1),
          action: (pos) => addPeerPlaceholder("user-device", pos),
        },
        {
          label: "New Server",
          icon: <ServerIcon size={14} />,
          shortcut: shortcutLabel(2),
          action: (pos) => addPeerPlaceholder("server", pos),
        },
        {
          label: "New Agent",
          icon: <BotIcon size={14} />,
          shortcut: shortcutLabel(3),
          action: (pos) => addPeerPlaceholder("agent", pos),
        },
      ],
      [
        {
          label: "New Policy",
          icon: <ShieldIcon size={14} />,
          shortcut: shortcutLabel(4),
          action: (pos) => addBlankPolicy(pos),
        },
        {
          label: "New Group",
          icon: <FolderGit2 size={14} />,
          shortcut: shortcutLabel(5),
          action: (pos) => addNewGroup({ x: pos.x - 100, y: pos.y - 30 }),
        },
      ],
      [
        {
          label: "New Network",
          icon: <NetworkIcon size={14} />,
          shortcut: shortcutLabel(6),
          action: (pos) => addBlankNode("network", pos),
        },
        {
          label: "New Resource",
          icon: <WorkflowIcon size={14} />,
          shortcut: shortcutLabel(7),
          action: (pos) => addBlankNode("resource", pos),
        },
      ],
    ],
    [addNewGroup, addBlankPolicy, addPeerPlaceholder, addBlankNode],
  );

  // Alt/⌥+1…7 create at the viewport center (draft-only, input-aware).
  const viewportCenter = useCallback(
    () =>
      reactFlow.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      }),
    [reactFlow],
  );

  const shortcutMap = useMemo(() => {
    const flat = draftItemGroups.flat();
    return Object.fromEntries(
      flat.map((item, i) => [
        `alt+${i + 1}`,
        () => item.action(viewportCenter()),
      ]),
    );
  }, [draftItemGroups, viewportCenter]);

  useControlCenterShortcuts(shortcutMap);

  // ---- Menu open/close ----

  const open = useCallback(
    (pos: MenuPosition) => {
      // Right-clicking the pane dismisses the components panel, matching
      // onPaneClick — the menu and the floating panel shouldn't coexist.
      setComponentsPanelOpen(false);
      setPosition(pos);
      onOpenChange?.(true);
    },
    [onOpenChange, setComponentsPanelOpen],
  );

  const close = useCallback(() => {
    setPosition(null);
    onOpenChange?.(false);
  }, [onOpenChange]);

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      // Live mode keeps the browser's default context menu.
      if (!isDraft) {
        close();
        return;
      }
      const target = e.target as HTMLElement;
      // The draft start screen overlays the pane while the canvas is empty —
      // right-clicking it counts as right-clicking the canvas.
      const isCanvas = target.closest(
        ".react-flow__pane, .draft-empty-canvas",
      );
      const isNode = target.closest(".react-flow__node");
      if (!isCanvas || isNode) {
        close();
        return;
      }
      e.preventDefault();
      open({ x: e.clientX, y: e.clientY });
    },
    [isDraft, open, close],
  );

  useEffect(() => {
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("click", close);
    document.addEventListener("scroll", close, true);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("click", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [handleContextMenu, close]);

  const menuItemClass =
    "flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-sm text-nb-gray-300 transition-colors hover:bg-nb-gray-900 hover:text-gray-50 cursor-pointer";

  const renderShortcut = (shortcut?: React.ReactNode) =>
    shortcut ? (
      <kbd
        className={
          "ml-auto pl-5 text-xs font-mono text-nb-gray-400 whitespace-nowrap"
        }
      >
        {shortcut}
      </kbd>
    ) : null;

  if (!position) return null;

  // Portaled to <body>: rendered inside ReactFlow the menu is trapped in the
  // canvas stacking context and ends up beneath overlays like the draft
  // start screen.
  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[210px] rounded-md border border-nb-gray-900 bg-nb-gray-940 p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
      style={{
        top: (menuPosition ?? position).y,
        left: (menuPosition ?? position).x,
      }}
    >
      {draftItemGroups.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <div className={"-mx-1 my-1 h-px bg-nb-gray-910"} />}
          {group.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.action(
                  reactFlow.screenToFlowPosition({
                    x: position.x,
                    y: position.y,
                  }),
                );
                close();
              }}
              className={menuItemClass}
            >
              {item.icon}
              {item.label}
              {renderShortcut(item.shortcut)}
            </button>
          ))}
        </React.Fragment>
      ))}
    </div>,
    document.body,
  );
};
