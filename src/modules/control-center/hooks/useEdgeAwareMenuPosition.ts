import { RefObject, useLayoutEffect, useState } from "react";

type MenuPosition = {
  x: number;
  y: number;
};

const EDGE_PADDING = 8;

/** Flips the menu across the cursor when it would overflow, then clamps. */
export const useEdgeAwareMenuPosition = (
  position: MenuPosition | null,
  menuRef: RefObject<HTMLElement | null>,
): MenuPosition | null => {
  const [adjusted, setAdjusted] = useState<MenuPosition | null>(null);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el || !position) return;
    // offsetWidth/Height ignore the zoom-in entrance transform.
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
