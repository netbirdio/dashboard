import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AssistantSidebarProvider,
  useAssistantSidebar,
} from "./AssistantSidebarProvider";

const navigation = { collapsed: false };
const toggleNavigation = vi.fn(() => {
  navigation.collapsed = !navigation.collapsed;
});
const permissions = { isRestricted: false };
const viewport = { md: true };
const headers = async () => ({ Authorization: "Bearer t" });
const probe = vi.fn((_host: string, _headers: unknown) => true);

vi.mock("@/contexts/ApplicationProvider", () => ({
  useApplicationContext: () => ({
    isNavigationCollapsed: navigation.collapsed,
    toggleNavigation,
  }),
}));
vi.mock("@/contexts/PermissionsProvider", () => ({
  usePermissions: () => permissions,
}));
vi.mock("@utils/config", () => ({
  default: () => ({ assistantApiOrigin: "https://assistant.test" }),
}));
vi.mock("@utils/responsive", () => ({ useIsMd: () => viewport.md }));
vi.mock("@/modules/assistant/useAssistantHeaders", () => ({
  useAssistantHeaders: () => headers,
}));
vi.mock("@/modules/assistant/hooks/useAssistantAvailable", () => ({
  useAssistantAvailable: (host: string, auth: unknown) => probe(host, auth),
}));

const mount = () =>
  renderHook(() => useAssistantSidebar(), { wrapper: AssistantSidebarProvider });

beforeEach(() => {
  navigation.collapsed = false;
  permissions.isRestricted = false;
  viewport.md = true;
  toggleNavigation.mockClear();
  probe.mockClear();
});

afterEach(cleanup);

describe("AssistantSidebarProvider", () => {
  it("collapses the navigation while open and gives it back on close", () => {
    const { result, rerender } = mount();

    act(() => result.current.setOpen(true));
    expect(navigation.collapsed).toBe(true);
    rerender();
    act(() => result.current.setOpen(false));
    expect(navigation.collapsed).toBe(false);
  });

  it("gives the navigation back when the page is left with the panel open", () => {
    const { result, rerender } = mount();

    act(() => result.current.setOpen(true));
    rerender();
    act(() => void globalThis.dispatchEvent(new Event("pagehide")));

    expect(navigation.collapsed).toBe(false);
    expect(toggleNavigation).toHaveBeenCalledTimes(2);
  });

  it("gives the navigation back when it unmounts with the panel open", () => {
    const { result, rerender, unmount } = mount();

    act(() => result.current.setOpen(true));
    rerender();
    unmount();

    expect(navigation.collapsed).toBe(false);
  });

  it("leaves alone a navigation the user had collapsed themselves", () => {
    navigation.collapsed = true;
    const { result, unmount } = mount();

    act(() => result.current.setOpen(true));
    unmount();

    expect(toggleNavigation).not.toHaveBeenCalled();
  });

  it("gives the navigation back on close after the window was narrowed", () => {
    const { result, rerender } = mount();

    act(() => result.current.setOpen(true));
    viewport.md = false;
    rerender();
    act(() => result.current.setOpen(false));

    expect(navigation.collapsed).toBe(false);
  });

  it("leaves the navigation alone when opened as an overlay", () => {
    viewport.md = false;
    const { result, rerender } = mount();

    act(() => result.current.setOpen(true));
    rerender();
    act(() => result.current.setOpen(false));

    expect(toggleNavigation).not.toHaveBeenCalled();
  });

  it("keeps the user's own last choice for the navigation made while the panel was open", () => {
    const { result, rerender } = mount();

    act(() => result.current.setOpen(true));
    rerender();
    navigation.collapsed = false;
    rerender();
    navigation.collapsed = true;
    rerender();
    toggleNavigation.mockClear();
    act(() => result.current.setOpen(false));

    expect(toggleNavigation).not.toHaveBeenCalled();
    expect(navigation.collapsed).toBe(true);
  });

  it("stops offsetting the page's overlays when it unmounts with the panel revealed", () => {
    const { result, unmount } = mount();

    act(() => result.current.setOpen(true));
    expect(document.documentElement.style.getPropertyValue("--nb-overlay-top")).not.toBe("0px");
    unmount();

    for (const side of ["top", "right", "bottom", "left", "radius"])
      expect(document.documentElement.style.getPropertyValue(`--nb-overlay-${side}`)).toBe("");
  });

  it("does not ask the assistant service about a restricted user", () => {
    permissions.isRestricted = true;
    mount();

    expect(probe).toHaveBeenCalledWith("https://assistant.test", undefined);
  });

  it("asks for everyone else", () => {
    mount();

    expect(probe).toHaveBeenCalledWith("https://assistant.test", headers);
  });
});
