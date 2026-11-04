import { Dispatch, SetStateAction, useState } from "react";

/**
 * Controls a tooltip that shows the full text of a truncated element.
 * Whether the text is cut off is checked only when the tooltip is about to
 * open, so no observer has to watch the element.
 * Pass `open` and `onOpenChange` to FullTooltip's `customOpen` and
 * `customOnOpenChange`, and `ref` to the truncated element.
 *
 * @param showAlways open the tooltip even when nothing is cut off,
 * e.g. because it shows more than the truncated text.
 */
export function useOverflowTooltip<T extends HTMLElement>(showAlways = false) {
  const [element, setElement] = useState<T | null>(null);
  const [open, setOpen] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const onOpenChange: Dispatch<SetStateAction<boolean>> = (next) => {
    const wantsOpen = typeof next === "function" ? next(open) : next;
    const overflowing = !!element && element.scrollWidth > element.clientWidth;
    setIsOverflowing(overflowing);
    setOpen(wantsOpen && (showAlways || overflowing));
  };

  return { ref: setElement, open, isOverflowing, onOpenChange };
}
