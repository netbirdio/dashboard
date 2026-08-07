import { RefObject, useLayoutEffect, useState } from "react";

type MenuPosition = {
  x: number;
  y: number;
};

const EDGE_PADDING = 8;

/**
 * Keeps a context menu inside the viewport: when the menu would overflow the
 * right/bottom edge it flips to the other side of the cursor, clamping to the
 * edge padding as a fallback (e.g. when flipping would push it past the
 * left/top edge). Returns the position to render the menu at; the raw click
 * position stays untouched for callers that create nodes there.
 *
 * Measures in a layout effect, so the first painted frame is already
 * adjusted — no visible jump.
 */
export const useEdgeAwareMenuPosition = (
  position: MenuPosition | null,
  menuRef: RefObject<HTMLElement | null>,
): MenuPosition | null => {
  const [adjusted, setAdjusted] = useState<MenuPosition | null>(null);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el || !position) return;
    // offsetWidth/Height ignore the zoom-in entrance transform, unlike
    // getBoundingClientRect.
    const { offsetWidth: width, offsetHeight: height } = el;
    let { x, y } = position;
    if (x + width > window.innerWidth - EDGE_PADDING) {
      x = Math.max(EDGE_PADDING, x - width);
    }
    if (y + height > window.innerHeight - EDGE_PADDING) {
      y = Math.max(EDGE_PADDING, y - height);
    }
    setAdjusted({ x, y });
  }, [position, menuRef]);

  return adjusted ?? position;
};
