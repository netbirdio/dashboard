import { Node, useReactFlow, XYPosition } from "@xyflow/react";
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

export type OnDropAction = ({ position }: { position: XYPosition }) => void;

// Pointer travel (px) below which a pointerdown/up pair counts as a click.
const CLICK_MOVE_THRESHOLD = 5;

// Gap kept between a click-added node and its neighbors.
const DROP_GAP = 24;
// A node that hasn't rendered yet has no measured size — drop actions center
// a ~200x60 card on the position, so reserve roughly that footprint for it.
// Existing nodes are checked against their actual measured rects.
const ESTIMATED_NODE_WIDTH = 220;
const ESTIMATED_NODE_HEIGHT = 84;
// Distance (flow px) between candidate spots when probing for free space.
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

// Candidate spots on growing rings around the desired position — nearest
// spots are tried first, in any direction.
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

// Where a click-added node should land: the desired spot if free, otherwise
// the nearest free spot the user can currently see, otherwise the nearest
// free spot outside the view (`outsideView: true` — the caller zooms out to
// reveal it).
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

  // Everything the user sees is occupied — keep searching beyond the view.
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
  // If a node is being dragged.
  isDragging: boolean;
  setIsDragging: Dispatch<SetStateAction<boolean>>;
  // The action to be performed when something is dropped on the flow.
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
        // This is a workaround to ensure that the drop action is not treated as a lazy function.
        setDropAction: (action) => setDropAction(() => action),
      }}
    >
      {children}
    </DragAndDropContext.Provider>
  );
}

export default DragAndDropContext;

export const useDragAndDrop = () => {
  const { screenToFlowPosition, getNodes, fitBounds } = useReactFlow();

  const context = useContext(DragAndDropContext);

  if (!context) {
    throw new Error("useDragAndDrop must be used within a DragAndDropProvider");
  }

  const { isDragging, setIsDragging, setDropAction, dropAction } = context;

  // Where the pointer went down — releasing within CLICK_MOVE_THRESHOLD px is
  // a click, not a drag.
  const dragStartPosition = useRef<XYPosition | undefined>(undefined);

  const onDragStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, onDrop: OnDropAction) => {
      event.preventDefault();
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
      dragStartPosition.current = { x: event.clientX, y: event.clientY };
      setIsDragging(true);
      setDropAction(onDrop);
    },
    [setIsDragging, setDropAction],
  );

  const onDragEnd = useCallback(
    (event: PointerEvent) => {
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

      // A plain click (no real drag) adds the node at the viewport center —
      // or, when that spot is occupied, the nearest visible free spot. When
      // the whole view is full, the node lands just outside it and the
      // viewport zooms out enough to reveal it.
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
        if (outsideView) {
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

      // Use elementFromPoint to get the actual element under the pointer
      const elementUnderPointer = document.elementFromPoint(
        event.clientX,
        event.clientY,
      );
      const isDroppingOnFlow = elementUnderPointer?.closest(".react-flow");

      // Only allow dropping on the flow area
      if (isDroppingOnFlow) {
        const flowPosition = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        dropAction?.({ position: flowPosition });
      }

      setIsDragging(false);
    },
    [screenToFlowPosition, getNodes, fitBounds, setIsDragging, dropAction],
  );

  // Add global touch event listeners
  useEffect(() => {
    if (!isDragging) return;

    document.addEventListener("pointerup", onDragEnd);

    return () => {
      document.removeEventListener("pointerup", onDragEnd);
    };
  }, [onDragEnd, isDragging]);

  // A REAL drag (pointer traveled past the click threshold) hides the
  // components panel right away so the canvas is visible while dragging —
  // plain clicks (click-to-place) keep it open.
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
    };
    document.addEventListener("pointermove", onMove);
    return () => document.removeEventListener("pointermove", onMove);
  }, [isDragging, setComponentsPanelOpen]);

  return {
    isDragging,
    onDragStart,
  };
};

export const useDragAndDropPosition = () => {
  const [position, setPosition] = useState<XYPosition | undefined>(undefined);

  // By default, the pointer move event sets the position of the dragged element in the context.
  // This will be used to display the `DragGhost` component.
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
