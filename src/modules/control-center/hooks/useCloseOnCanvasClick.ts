import { useEffect } from "react";

// Closes a controlled dropdown/popover when the user clicks inside the
// ReactFlow canvas (e.g. an on-canvas SelectDropdown, or the header's network
// selector floating over it). Radix's own outside-click detection doesn't fire
// there: the pane stops pointer propagation before the document listener would
// see it, so we listen in the CAPTURE phase — which runs before that
// stopPropagation. Only attaches while open, so the click that OPENS the
// popover (which predates the listener) is never caught; option clicks live in
// a portal outside `.react-flow`, so they aren't caught either.
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
