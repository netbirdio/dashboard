import { useReactFlow, XYPosition } from "@xyflow/react";
import { createContext, Dispatch, SetStateAction, useCallback, useContext, useEffect, useState } from "react";

export type OnDropAction = ({ position }: { position: XYPosition }) => void;

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
  const { screenToFlowPosition } = useReactFlow();

  const context = useContext(DragAndDropContext);

  if (!context) {
    throw new Error("useDragAndDrop must be used within a DragAndDropProvider");
  }

  const { isDragging, setIsDragging, setDropAction, dropAction } = context;

  const onDragStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, onDrop: OnDropAction) => {
      event.preventDefault();
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
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

      // Use elementFromPoint to get the actual element under the pointer
      const elementUnderPointer = document.elementFromPoint(
        event.clientX,
        event.clientY,
      );
      const isDroppingOnFlow = elementUnderPointer?.closest(".react-flow");
      event.preventDefault();

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
    [screenToFlowPosition, setIsDragging, dropAction],
  );

  // Add global touch event listeners
  useEffect(() => {
    if (!isDragging) return;

    document.addEventListener("pointerup", onDragEnd);

    return () => {
      document.removeEventListener("pointerup", onDragEnd);
    };
  }, [onDragEnd, isDragging]);

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
