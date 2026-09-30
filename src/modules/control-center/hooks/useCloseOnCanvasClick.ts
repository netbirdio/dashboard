import { useEffect } from "react";

// Radix's outside-click never fires inside the ReactFlow pane, which stops
// pointer propagation, so listen in the CAPTURE phase.
export function useCloseOnCanvasClick(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(".react-flow")) close();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, close]);
}
