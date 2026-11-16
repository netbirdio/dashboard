import { Node, useReactFlow, XYPosition } from "@xyflow/react";
import { isFrameNode } from "@/modules/control-center/utils/helpers";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type OnDropAction = ({
  position,
  targetNodeId,
}: {
  position: XYPosition;
  targetNodeId?: string;
}) => void;

// Pointer travel (px) below which a pointerdown/up pair counts as a click.
const CLICK_MOVE_THRESHOLD = 5;

const DROP_GAP = 24;
// An unrendered node has no measured size, so reserve roughly the card footprint.
const ESTIMATED_NODE_WIDTH = 220;
const ESTIMATED_NODE_HEIGHT = 84;
// Distance in flow px between candidate spots.
const SEARCH_STEP = 48;

// Visible canvas area in flow coordinates.
type FlowRect = { left: number; top: number; right: number; bottom: number };

const isSpotFree = (nodes: Node[], center: XYPosition) => {
  const left = center.x - ESTIMATED_NODE_WIDTH / 2;
  const top = center.y - ESTIMATED_NODE_HEIGHT / 2;
  return !nodes.some((node) => {
    const width = node.measured?.width ?? node.width ?? ESTIMATED_NODE_WIDTH;
    const height =
      node.measured?.height ?? node.height ?? ESTIMATED_NODE_HEIGHT;
    return (
      node.position.x < left + ESTIMATED_NODE_WIDTH + DROP_GAP &&
      node.position.x + width + DROP_GAP > left &&
      node.position.y < top + ESTIMATED_NODE_HEIGHT + DROP_GAP &&
      node.position.y + height + DROP_GAP > top
    );
  });
};

const isInsideView = (center: XYPosition, view: FlowRect) =>
  center.x - ESTIMATED_NODE_WIDTH / 2 >= view.left &&
  center.x + ESTIMATED_NODE_WIDTH / 2 <= view.right &&
  center.y - ESTIMATED_NODE_HEIGHT / 2 >= view.top &&
  center.y + ESTIMATED_NODE_HEIGHT / 2 <= view.bottom;

// Growing rings around the desired position: nearest spots first.
function* ringCandidates(center: XYPosition, maxRadius: number) {
  for (let radius = SEARCH_STEP; radius <= maxRadius; radius += SEARCH_STEP) {
    const samples = Math.max(
      8,
      Math.round((2 * Math.PI * radius) / SEARCH_STEP),
    );
    for (let i = 0; i < samples; i++) {
      const angle = (i / samples) * 2 * Math.PI;
      yield {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      };
    }
  }
}

// Nearest free spot to `desired`; `outsideView` tells the caller to zoom out.
const findFreeDropPosition = (
  nodes: Node[],
  desired: XYPosition,
  view: FlowRect,
): { position: XYPosition; outsideView: boolean } => {
  if (isSpotFree(nodes, desired)) {
    return { position: desired, outsideView: false };
  }

  const viewRadius = Math.hypot(view.right - view.left, view.bottom - view.top);
  for (const candidate of ringCandidates(desired, viewRadius)) {
    if (isInsideView(candidate, view) && isSpotFree(nodes, candidate)) {
      return { position: candidate, outsideView: false };
    }
  }

  // Everything the user sees is occupied, so search beyond the view.
  for (const candidate of ringCandidates(desired, viewRadius * 4)) {
    if (isSpotFree(nodes, candidate)) {
      return { position: candidate, outsideView: true };
    }
  }

  // Degenerate fallback: right of every node on the canvas.
  const rightmost = Math.max(
    ...nodes.map((n) => n.position.x + (n.measured?.width ?? n.width ?? 0)),
  );
  return {
    position: {
      x: rightmost + DROP_GAP + ESTIMATED_NODE_WIDTH / 2,
      y: desired.y,
    },
    outsideView: true,
  };
};

interface DragAndDropContextType {
  isDragging: boolean;
  setIsDragging: Dispatch<SetStateAction<boolean>>;
  dropAction: OnDropAction | null;
  setDropAction: Dispatch<SetStateAction<OnDropAction | null>>;
}

const DragAndDropContext = createContext<DragAndDropContextType | null>(null);

export function DragAndDropProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dropAction, setDropAction] = useState<OnDropAction | null>(null);

  return (
    <DragAndDropContext.Provider
      value={{
        isDragging,
        setIsDragging,
        dropAction,
        // Wrap so React doesn't treat the drop action as a lazy state updater.
        setDropAction: (action) => setDropAction(() => action),
      }}
    >
      {children}
    </DragAndDropContext.Provider>
  );
}

export const useDragAndDrop = () => {
  const { screenToFlowPosition, getNodes, fitBounds, setNodes } =
    useReactFlow();

  const context = useContext(DragAndDropContext);

  if (!context) {
    throw new Error("useDragAndDrop must be used within a DragAndDropProvider");
  }

  const { isDragging, setIsDragging, setDropAction, dropAction } = context;

  const dragStartPosition = useRef<XYPosition | undefined>(undefined);
  const canDropIntoFrame = useRef(false);
  // Templates that open a modal skip the reveal: zooming under a modal is
  // disorienting.
  const skipClickReveal = useRef(false);

  // Walks a frame child up to its parent frame.
  const frameUnderPoint = useCallback(
    (clientX: number, clientY: number): string | undefined => {
      const overId =
        document
          .elementFromPoint(clientX, clientY)
          ?.closest(".react-flow__node")
          ?.getAttribute("data-id") ?? undefined;
      if (!overId) return undefined;
      const node = getNodes().find((n) => n.id === overId);
      if (isFrameNode(node)) return overId;
      return node?.parentId?.startsWith("network-")
        ? node.parentId
        : undefined;
    },
    [getNodes],
  );

  const setFrameDropTarget = useCallback(
    (frameId: string | undefined) => {
      setNodes((prev) =>
        prev.map((n) => {
          if (!isFrameNode(n)) return n;
          const isTarget = n.id === frameId;
          if (!!n.data.dropTarget === isTarget) return n;
          return { ...n, data: { ...n.data, dropTarget: isTarget } };
        }),
      );
    },
    [setNodes],
  );

  const onDragStart = useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
      onDrop: OnDropAction,
      options?: { canDropIntoFrame?: boolean; skipClickReveal?: boolean },
    ) => {
      event.preventDefault();
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
      dragStartPosition.current = { x: event.clientX, y: event.clientY };
      canDropIntoFrame.current = !!options?.canDropIntoFrame;
      skipClickReveal.current = !!options?.skipClickReveal;
      setIsDragging(true);
      setDropAction(onDrop);
    },
    [setIsDragging, setDropAction],
  );

  const onDragEnd = useCallback(
    (event: PointerEvent) => {
      if (canDropIntoFrame.current) setFrameDropTarget(undefined);
      if (!isDragging) {
        setIsDragging(false);
        return;
      }

      (event.target as HTMLElement).releasePointerCapture(event.pointerId);
      event.preventDefault();

      const start = dragStartPosition.current;
      const moved = start
        ? Math.hypot(event.clientX - start.x, event.clientY - start.y)
        : Infinity;

      // A plain click adds the node at the viewport center, or the nearest free spot.
      if (moved < CLICK_MOVE_THRESHOLD) {
        const rect = document
          .querySelector(".react-flow")
          ?.getBoundingClientRect() ?? {
          left: 0,
          top: 0,
          right: window.innerWidth,
          bottom: window.innerHeight,
        };
        const topLeft = screenToFlowPosition({ x: rect.left, y: rect.top });
        const bottomRight = screenToFlowPosition({
          x: rect.right,
          y: rect.bottom,
        });
        const view: FlowRect = {
          left: topLeft.x,
          top: topLeft.y,
          right: bottomRight.x,
          bottom: bottomRight.y,
        };
        const { position, outsideView } = findFreeDropPosition(
          getNodes(),
          {
            x: (view.left + view.right) / 2,
            y: (view.top + view.bottom) / 2,
          },
          view,
        );
        dropAction?.({ position });
        if (outsideView && !skipClickReveal.current) {
          const minX = Math.min(
            view.left,
            position.x - ESTIMATED_NODE_WIDTH / 2 - DROP_GAP,
          );
          const minY = Math.min(
            view.top,
            position.y - ESTIMATED_NODE_HEIGHT / 2 - DROP_GAP,
          );
          const maxX = Math.max(
            view.right,
            position.x + ESTIMATED_NODE_WIDTH / 2 + DROP_GAP,
          );
          const maxY = Math.max(
            view.bottom,
            position.y + ESTIMATED_NODE_HEIGHT / 2 + DROP_GAP,
          );
          void fitBounds(
            { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
            { duration: 300 },
          );
        }
        setIsDragging(false);
        return;
      }

      const elementUnderPointer = document.elementFromPoint(
        event.clientX,
        event.clientY,
      );
      const isDroppingOnFlow = elementUnderPointer?.closest(".react-flow");

      if (isDroppingOnFlow) {
        const flowPosition = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        const overId =
          elementUnderPointer
            ?.closest(".react-flow__node")
            ?.getAttribute("data-id") ?? undefined;
        const overNode = overId
          ? getNodes().find((n) => n.id === overId)
          : undefined;
        const targetNodeId = overNode?.parentId?.startsWith("network-")
          ? overNode.parentId
          : overId;
        dropAction?.({ position: flowPosition, targetNodeId });
      }

      setIsDragging(false);
    },
    [
      screenToFlowPosition,
      getNodes,
      fitBounds,
      setIsDragging,
      dropAction,
      setFrameDropTarget,
    ],
  );

  useEffect(() => {
    if (!isDragging) return;

    document.addEventListener("pointerup", onDragEnd);

    return () => {
      document.removeEventListener("pointerup", onDragEnd);
    };
  }, [onDragEnd, isDragging]);

  // A real drag hides the components panel; plain clicks keep it open.
  const { setComponentsPanelOpen } = useDraftMode();
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (event: PointerEvent) => {
      const start = dragStartPosition.current;
      if (!start) return;
      const moved = Math.hypot(
        event.clientX - start.x,
        event.clientY - start.y,
      );
      if (moved >= CLICK_MOVE_THRESHOLD) setComponentsPanelOpen(false);
      if (canDropIntoFrame.current) {
        setFrameDropTarget(frameUnderPoint(event.clientX, event.clientY));
      }
    };
    document.addEventListener("pointermove", onMove);
    return () => document.removeEventListener("pointermove", onMove);
  }, [isDragging, setComponentsPanelOpen, frameUnderPoint, setFrameDropTarget]);

  return {
    isDragging,
    onDragStart,
  };
};

export const useDragAndDropPosition = () => {
  const [position, setPosition] = useState<XYPosition | undefined>(undefined);

  const onDrag = useCallback((event: PointerEvent) => {
    event.preventDefault();
    setPosition({ x: event.clientX, y: event.clientY });
  }, []);

  useEffect(() => {
    document.addEventListener("pointermove", onDrag);
    return () => {
      document.removeEventListener("pointermove", onDrag);
    };
  }, [onDrag]);

  return { position };
};
