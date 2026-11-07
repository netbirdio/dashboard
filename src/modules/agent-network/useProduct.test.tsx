import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetCurrentProduct } from "@/modules/agent-network/productStore";
import { useProduct } from "@/modules/agent-network/useProduct";

const route = vi.hoisted(() => ({ path: "/peers" }));
const mode = vi.hoisted(() => ({ only: false, enabled: true }));

vi.mock("next/navigation", () => ({ usePathname: () => route.path }));
vi.mock("@/contexts/PermissionsProvider", () => ({
  usePermissions: () => ({
    permission: { "agent_network.providers": { read: true } },
  }),
}));
vi.mock("@/modules/agent-network/useAgentNetworkMode", () => ({
  useAgentNetworkMode: () => ({ ...mode, loading: false }),
}));
vi.mock("@/modules/agent-network/useMyAgentNetworkSetup", () => ({
  useMyAgentNetworkSetup: () => ({ configured: false }),
}));

const navigate = (rerender: () => void, path: string) => {
  route.path = path;
  rerender();
};

describe("useProduct", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetCurrentProduct();
    route.path = "/peers";
    mode.only = false;
    mode.enabled = true;
  });
  afterEach(() => {
    sessionStorage.clear();
    resetCurrentProduct();
  });

  it("starts in Networking on a page both products show", () => {
    const { result } = renderHook(() => useProduct());
    expect(result.current.switchable).toBe(true);
    expect(result.current.product).toBe("networking");
  });

  it("stays in Agent Network on Peers, Control Center and Team", () => {
    route.path = "/agent-network/providers";
    const { result, rerender } = renderHook(() => useProduct());
    expect(result.current.product).toBe("agent-network");
    for (const path of ["/peers", "/control-center", "/team/users"]) {
      navigate(rerender, path);
      expect(result.current.product).toBe("agent-network");
      expect(result.current.focused).toBe(true);
    }
  });

  it("goes back to Networking on a page only Networking has", () => {
    route.path = "/agent-network/providers";
    const { result, rerender } = renderHook(() => useProduct());
    navigate(rerender, "/dns/zones");
    expect(result.current.product).toBe("networking");
    navigate(rerender, "/peers");
    expect(result.current.product).toBe("networking");
  });

  it("switches to Networking from an Agent Network page and lands on Peers in it", () => {
    route.path = "/agent-network/providers";
    const { result, rerender } = renderHook(() => useProduct());
    act(() => result.current.select("networking"));
    // The route follows the switch a moment later; until then nothing may
    // put the product back to Agent Network.
    rerender();
    navigate(rerender, result.current.homes.networking);
    expect(result.current.product).toBe("networking");
  });

  it("switches to Agent Network from a page both products show", () => {
    const { result, rerender } = renderHook(() => useProduct());
    act(() => result.current.select("agent-network"));
    expect(result.current.product).toBe("agent-network");
    navigate(rerender, result.current.homes["agent-network"]);
    expect(result.current.product).toBe("agent-network");
  });

  it("is always Agent Network on a dashboard focused on it, without a switch", () => {
    mode.only = true;
    const { result } = renderHook(() => useProduct());
    expect(result.current.switchable).toBe(false);
    expect(result.current.product).toBe("agent-network");
  });
});
