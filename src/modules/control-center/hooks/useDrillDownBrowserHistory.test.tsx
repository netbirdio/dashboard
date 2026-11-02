import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A UI drill exit schedules a 150 ms timer that later consumes the owned history
// entry via history.back(). If the browser consumes that entry first or the page
// navigates away, the timer must not fire — its back() would land in foreign history.

let selectedNetwork = "";
const onNetworkSelect = vi.fn((id: string) => {
  selectedNetwork = id;
});

vi.mock("@/modules/control-center/contexts/ControlCenterContext", () => ({
  useCanvasState: () => ({ selectedNetwork }),
  useControlCenterUI: () => ({ onNetworkSelect }),
}));
vi.mock("@/modules/control-center/draft/DraftModeContext", () => ({
  useDraftMode: () => ({
    isDraft: false,
    drillDownNetworkNodeId: null,
    setDrillDownNetworkNodeId: vi.fn(),
  }),
}));

const { useDrillDownBrowserHistory } = await import(
  "@/modules/control-center/hooks/useDrillDownBrowserHistory"
);

let pushSpy: ReturnType<typeof vi.spyOn>;
let backSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  selectedNetwork = "";
  onNetworkSelect.mockClear();
  vi.useFakeTimers();
  pushSpy = vi
    .spyOn(window.history, "pushState")
    .mockImplementation(() => {});
  backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  pushSpy.mockRestore();
  backSpy.mockRestore();
});

const drillInAndOut = () => {
  const view = renderHook(() => useDrillDownBrowserHistory());
  selectedNetwork = "n1";
  view.rerender();
  expect(pushSpy).toHaveBeenCalledTimes(1);
  selectedNetwork = "";
  view.rerender();
  return view;
};

describe("useDrillDownBrowserHistory", () => {
  it("consumes the pushed entry once after a UI exit", () => {
    drillInAndOut();
    vi.runAllTimers();
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it("cancels the consume timer when browser Back pops the entry first", () => {
    drillInAndOut();
    // Browser Back within the 150 ms window: the entry is already consumed.
    window.dispatchEvent(new PopStateEvent("popstate"));
    vi.runAllTimers();
    expect(backSpy).not.toHaveBeenCalled();
  });

  it("cancels pending consume timers on unmount", () => {
    const view = drillInAndOut();
    // A navigation away (sidebar link) unmounts the hook mid-window.
    view.unmount();
    vi.runAllTimers();
    expect(backSpy).not.toHaveBeenCalled();
  });
});
