import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLastProduct,
  resetLastProducts,
  setLastProduct,
} from "@/modules/agent-network/productStore";
import {
  useProduct,
  useProductUrlSync,
} from "@/modules/agent-network/useProduct";

const route = vi.hoisted(() => ({ path: "/peers", search: "" }));
const mode = vi.hoisted(() => ({ only: false, enabled: true }));
const user = vi.hoisted(() => ({ id: "u1" as string | undefined }));
const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => route.path,
  useSearchParams: () => new URLSearchParams(route.search),
  useRouter: () => ({ replace }),
}));
vi.mock("@/contexts/PermissionsProvider", () => ({
  usePermissions: () => ({
    permission: { "agent_network.providers": { read: true } },
  }),
}));
vi.mock("@/contexts/UsersProvider", () => ({
  useUserProfile: () => ({
    loggedInUser: user.id ? { id: user.id } : undefined,
  }),
}));
vi.mock("@/modules/agent-network/useAgentNetworkMode", () => ({
  useAgentNetworkMode: () => ({ ...mode, loading: false }),
}));
vi.mock("@/modules/agent-network/useMyAgentNetworkSetup", () => ({
  useMyAgentNetworkSetup: () => ({ configured: false }),
}));

/* The layout mounts the URL sync once; every other caller only reads. */
const useLayout = () => {
  useProductUrlSync();
  return useProduct();
};

const open = (url: string) => {
  const [path, search = ""] = url.split("?");
  route.path = path;
  route.search = search;
};

describe("useProduct", () => {
  beforeEach(() => {
    localStorage.clear();
    resetLastProducts();
    replace.mockReset();
    open("/peers");
    mode.only = false;
    mode.enabled = true;
    user.id = "u1";
  });
  afterEach(() => {
    localStorage.clear();
    resetLastProducts();
  });

  it("starts in Networking on a shared page, and puts that in the URL", () => {
    const { result } = renderHook(useLayout);
    expect(result.current.switchable).toBe(true);
    expect(result.current.product).toBe("networking");
    expect(result.current.crumb).toBe("networking");
    expect(replace).toHaveBeenCalledWith("/peers?product=networking", {
      scroll: false,
    });
  });

  it("opens a copied Agent Network link to Peers in Agent Network", () => {
    // A user whose last product was Networking opens a teammate's link.
    setLastProduct("u1", "networking");
    open("/peers?product=agent-network");
    const { result } = renderHook(useLayout);
    expect(result.current.product).toBe("agent-network");
    expect(result.current.crumb).toBe("agent-network");
    expect(replace).not.toHaveBeenCalled();
    // ... and that becomes their last product.
    expect(getLastProduct("u1")).toBe("agent-network");
  });

  it("keeps Agent Network on a peer opened from an in-page link", () => {
    open("/agent-network/providers");
    const { result, rerender } = renderHook(useLayout);
    expect(result.current.product).toBe("agent-network");
    // A peer row links to /peer?id=… without naming the product.
    open("/peer?id=p1");
    rerender();
    expect(result.current.product).toBe("agent-network");
    expect(replace).toHaveBeenLastCalledWith(
      "/peer?id=p1&product=agent-network",
      { scroll: false },
    );
  });

  it("goes back to Networking on a page only Networking has", () => {
    open("/peers?product=agent-network");
    const { result, rerender } = renderHook(useLayout);
    open("/dns/zones");
    rerender();
    expect(result.current.product).toBe("networking");
    open("/peers");
    rerender();
    expect(result.current.product).toBe("networking");
  });

  it("drops a stray product from a page of one product", () => {
    open("/agent-network/usage?product=networking&tab=logs");
    const { result } = renderHook(useLayout);
    expect(result.current.product).toBe("agent-network");
    expect(result.current.crumb).toBeUndefined();
    expect(replace).toHaveBeenCalledWith("/agent-network/usage?tab=logs", {
      scroll: false,
    });
  });

  it("remembers the product per user, not per tab", () => {
    setLastProduct("u1", "agent-network");
    setLastProduct("u2", "networking");
    const { result, rerender } = renderHook(() => useProduct());
    expect(result.current.product).toBe("agent-network");
    user.id = "u2";
    rerender();
    expect(result.current.product).toBe("networking");
  });

  it("remembers the product chosen in the switch before navigating", () => {
    const { result, rerender } = renderHook(useLayout);
    act(() => result.current.select("agent-network"));
    expect(getLastProduct("u1")).toBe("agent-network");
    open(result.current.homes["agent-network"]);
    rerender();
    expect(result.current.product).toBe("agent-network");
    act(() => result.current.select("networking"));
    open(result.current.homes.networking);
    rerender();
    expect(result.current.product).toBe("networking");
  });

  it("is always Agent Network on an Agent Network only dashboard, without a switch or URL changes", () => {
    mode.only = true;
    open("/peers?product=networking");
    const { result } = renderHook(useLayout);
    expect(result.current.switchable).toBe(false);
    expect(result.current.product).toBe("agent-network");
    expect(result.current.crumb).toBe("agent-network");
    expect(replace).not.toHaveBeenCalled();
  });

  it("leaves the URL and the memory alone without Agent Network", () => {
    mode.enabled = false;
    open("/peers?product=agent-network");
    const { result } = renderHook(useLayout);
    expect(result.current.switchable).toBe(false);
    expect(result.current.product).toBe("networking");
    expect(result.current.crumb).toBeUndefined();
    expect(replace).not.toHaveBeenCalled();
    expect(getLastProduct("u1")).toBeUndefined();
  });
});
