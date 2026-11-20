import { act, renderHook } from "@testing-library/react";
import type { AnimationEvent } from "react";
import { describe, expect, it } from "vitest";
import { useToggleAnimation } from "./useToggleAnimation";

const animationEnd = (target: object, currentTarget: object) =>
  ({ target, currentTarget }) as unknown as AnimationEvent;

describe("useToggleAnimation", () => {
  it("does not animate until the user toggles", () => {
    const { result } = renderHook(() => useToggleAnimation());
    expect(result.current.className).toBeUndefined();
  });

  it("animates after a toggle and stops once its own animation ends", () => {
    const { result } = renderHook(() => useToggleAnimation());
    const content = {};

    act(() => result.current.onToggle());
    expect(result.current.className).toContain("animate-collapsible-down");

    act(() => result.current.onAnimationEnd(animationEnd(content, content)));
    expect(result.current.className).toBeUndefined();
  });

  it("keeps animating when a nested collapsible's animation ends", () => {
    const { result } = renderHook(() => useToggleAnimation());

    act(() => result.current.onToggle());
    act(() => result.current.onAnimationEnd(animationEnd({}, {})));
    expect(result.current.className).toBeDefined();
  });
});
