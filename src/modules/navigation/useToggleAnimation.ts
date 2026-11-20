import { type AnimationEvent, useCallback, useState } from "react";

const ANIMATION_CLASS_NAME =
  "data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up motion-reduce:animate-none";

/**
 * Animates a collapsible only when the user toggles it. Sections also open
 * and close on their own: restored from localStorage after the first render,
 * on navigation, or when the sidebar shrinks to icons. Those should switch
 * at once, not play the accordion animation.
 */
export const useToggleAnimation = (open: boolean) => {
  // The state the user's toggle asked for, until its animation ends.
  const [requested, setRequested] = useState<boolean | null>(null);
  const [previousOpen, setPreviousOpen] = useState(open);

  // Something else overrode the toggle, e.g. the sidebar shrank to icons and
  // forced the section open mid-close; that change must not animate.
  if (open !== previousOpen) {
    setPreviousOpen(open);
    if (requested !== null && requested !== open) setRequested(null);
  }

  const onToggle = useCallback((next: boolean) => setRequested(next), []);

  const onAnimationEnd = useCallback((event: AnimationEvent) => {
    // Nested collapsibles bubble their own animation end up to this one.
    if (event.target === event.currentTarget) setRequested(null);
  }, []);

  return {
    className: requested === open ? ANIMATION_CLASS_NAME : undefined,
    onToggle,
    onAnimationEnd,
  };
};
