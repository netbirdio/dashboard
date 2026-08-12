import { useEffect } from "react";

// Closes a controlled dropdown/popover on a click inside the ReactFlow canvas.
// Radix's outside-click doesn't fire there (the pane stops pointer propagation
// before the document listener sees it), so listen in the CAPTURE phase.
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
