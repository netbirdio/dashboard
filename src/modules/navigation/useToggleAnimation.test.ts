import { act, renderHook } from "@testing-library/react";
import type { AnimationEvent } from "react";
import { describe, expect, it } from "vitest";
import { useToggleAnimation } from "./useToggleAnimation";

const animationEnd = (target: object, currentTarget: object) =>
  ({ target, currentTarget }) as unknown as AnimationEvent;

const setup = (open: boolean) =>
  renderHook(({ open }) => useToggleAnimation(open), {
    initialProps: { open },
  });

describe("useToggleAnimation", () => {
  it("does not animate an open state the user didn't ask for", () => {
    const { result, rerender } = setup(false);
    rerender({ open: true });
    expect(result.current.className).toBeUndefined();
  });

  it("animates a toggle and stops once its own animation ends", () => {
    const { result, rerender } = setup(true);
    const content = {};

    act(() => result.current.onToggle(false));
    rerender({ open: false });
    expect(result.current.className).toContain("animate-collapsible-up");

    act(() => result.current.onAnimationEnd(animationEnd(content, content)));
    expect(result.current.className).toBeUndefined();
  });

  it("keeps animating when a nested collapsible's animation ends", () => {
    const { result, rerender } = setup(false);

    act(() => result.current.onToggle(true));
    rerender({ open: true });
    act(() => result.current.onAnimationEnd(animationEnd({}, {})));
    expect(result.current.className).toBeDefined();
  });

  it("drops the animation when something else overrides the toggle", () => {
    // The user closes a section, then the sidebar shrinks to icons and forces
    // it open again before the closing animation has ended.
    const { result, rerender } = setup(true);

    act(() => result.current.onToggle(false));
    rerender({ open: false });
    rerender({ open: true });
    expect(result.current.className).toBeUndefined();

    // Back to full width, the remembered closed state applies without one.
    rerender({ open: false });
    expect(result.current.className).toBeUndefined();
  });
});
