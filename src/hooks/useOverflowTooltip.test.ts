import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useOverflowTooltip } from "@hooks/useOverflowTooltip";

// jsdom has no layout, so the element's sizes are set by hand.
const element = (scrollWidth: number, clientWidth: number) => {
  const el = document.createElement("div");
  Object.defineProperty(el, "scrollWidth", { value: scrollWidth });
  Object.defineProperty(el, "clientWidth", { value: clientWidth });
  return el;
};

const setup = (el: HTMLElement | null, showAlways?: boolean) => {
  const hook = renderHook(() => useOverflowTooltip<HTMLElement>(showAlways));
  act(() => hook.result.current.ref(el));
  return hook;
};

describe("useOverflowTooltip", () => {
  it("opens when the text is cut off", () => {
    const { result } = setup(element(200, 100));
    act(() => result.current.onOpenChange(true));
    expect(result.current.open).toBe(true);
    expect(result.current.isOverflowing).toBe(true);
  });

  it("stays closed when the text fits", () => {
    const { result } = setup(element(100, 100));
    act(() => result.current.onOpenChange(true));
    expect(result.current.open).toBe(false);
    expect(result.current.isOverflowing).toBe(false);
  });

  it("opens with showAlways even when the text fits", () => {
    const { result } = setup(element(100, 100), true);
    act(() => result.current.onOpenChange(true));
    expect(result.current.open).toBe(true);
    expect(result.current.isOverflowing).toBe(false);
  });

  it("closes when asked to", () => {
    const { result } = setup(element(200, 100));
    act(() => result.current.onOpenChange(true));
    act(() => result.current.onOpenChange(false));
    expect(result.current.open).toBe(false);
  });

  it("accepts an updater function", () => {
    const { result } = setup(element(200, 100));
    act(() => result.current.onOpenChange((open) => !open));
    expect(result.current.open).toBe(true);
  });

  it("stays closed before the element is attached", () => {
    const { result } = setup(null);
    act(() => result.current.onOpenChange(true));
    expect(result.current.open).toBe(false);
  });
});
