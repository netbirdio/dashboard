import { type AnimationEvent, useCallback, useState } from "react";

const ANIMATION_CLASS_NAME =
  "data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up motion-reduce:animate-none";

/**
 * Animates a collapsible only when the user toggles it. Sections also open
 * and close on their own: restored from localStorage after the first render,
 * on navigation, or when the sidebar shrinks to icons. Those should switch
 * at once, not play the accordion animation.
 */
export const useToggleAnimation = () => {
  const [animate, setAnimate] = useState(false);

  const onToggle = useCallback(() => setAnimate(true), []);

  const onAnimationEnd = useCallback((event: AnimationEvent) => {
    // Nested collapsibles bubble their own animation end up to this one.
    if (event.target === event.currentTarget) setAnimate(false);
  }, []);

  return {
    className: animate ? ANIMATION_CLASS_NAME : undefined,
    onToggle,
    onAnimationEnd,
  };
};
