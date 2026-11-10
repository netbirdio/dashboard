import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NAV_SECTIONS_STORAGE_KEY } from "@/modules/navigation/sections";
import { useNavSections } from "@/modules/navigation/useNavSections";

const route = vi.hoisted(() => ({ path: "/peers" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.path }));

const stored = () =>
  JSON.parse(localStorage.getItem(NAV_SECTIONS_STORAGE_KEY) ?? "{}");

describe("useNavSections", () => {
  beforeEach(() => {
    localStorage.clear();
    route.path = "/peers";
  });
  afterEach(() => {
    // Hooks still mounted from an earlier test would answer the storage
    // events of the next one.
    cleanup();
    localStorage.clear();
  });

  it("opens every section and highlights none on a page both products use", () => {
    const { result } = renderHook(() => useNavSections("alice"));
    expect(result.current.isOpen("networking")).toBe(true);
    expect(result.current.isOpen("agent-network")).toBe(true);
    expect(result.current.isActive("networking")).toBe(false);
    expect(result.current.isActive("agent-network")).toBe(false);
    expect(result.current.isActive("account")).toBe(false);
  });

  it("remembers a closed section in localStorage, per user", () => {
    const { result } = renderHook(() => useNavSections("alice"));
    act(() => result.current.setOpen("networking", false));
    expect(result.current.isOpen("networking")).toBe(false);
    expect(stored()).toEqual({ alice: { networking: false } });

    // Another user on the same browser keeps their own state.
    const { result: bob } = renderHook(() => useNavSections("bob"));
    expect(bob.current.isOpen("networking")).toBe(true);

    // The same user finds it closed again on the next visit.
    const { result: again } = renderHook(() => useNavSections("alice"));
    expect(again.current.isOpen("networking")).toBe(false);
  });

  it("highlights the section of the current page", () => {
    route.path = "/agent-network/usage";
    const { result } = renderHook(() => useNavSections("alice"));
    expect(result.current.isActive("agent-network")).toBe(true);
    expect(result.current.isActive("networking")).toBe(false);
  });

  it("highlights no section on a page both products use", () => {
    route.path = "/groups";
    const { result } = renderHook(() => useNavSections("alice"));
    expect(result.current.isActive("networking")).toBe(false);
    expect(result.current.isActive("agent-network")).toBe(false);
    expect(result.current.isActive("account")).toBe(false);
  });

  it("opens a closed section when a page inside it is opened", () => {
    localStorage.setItem(
      NAV_SECTIONS_STORAGE_KEY,
      JSON.stringify({ alice: { networking: false, "agent-network": false } }),
    );
    const { result, rerender } = renderHook(() => useNavSections("alice"));
    expect(result.current.isOpen("networking")).toBe(false);

    route.path = "/dns/zones";
    rerender();
    expect(result.current.isOpen("networking")).toBe(true);
    // Only the section of the page opens.
    expect(result.current.isOpen("agent-network")).toBe(false);
    expect(stored().alice.networking).toBe(true);
  });

  it("lets the user close the section of the page they are on", () => {
    route.path = "/agent-network/usage";
    const { result, rerender } = renderHook(() => useNavSections("alice"));
    act(() => result.current.setOpen("agent-network", false));
    rerender();
    expect(result.current.isOpen("agent-network")).toBe(false);
    // Still highlighted: the page is in it.
    expect(result.current.isActive("agent-network")).toBe(true);
  });
});
