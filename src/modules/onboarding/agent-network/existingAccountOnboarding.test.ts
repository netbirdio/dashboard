import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearAgentNetworkOnboardingRequest,
  hasAgentNetworkOnboardingRequest,
  ownDeviceConnected,
  requestAgentNetworkOnboarding,
  resolveOnboardingRequest,
  useAgentNetworkOnboardingRequest,
} from "@/modules/onboarding/agent-network/existingAccountOnboarding";

afterEach(() => localStorage.clear());

describe("onboarding request marker", () => {
  it("is kept per account", () => {
    requestAgentNetworkOnboarding("acc-1");
    expect(hasAgentNetworkOnboardingRequest("acc-1")).toBe(true);
    expect(
      hasAgentNetworkOnboardingRequest("acc-2"),
      "another account in the same browser has no request",
    ).toBe(false);
    clearAgentNetworkOnboardingRequest("acc-1");
    expect(hasAgentNetworkOnboardingRequest("acc-1")).toBe(false);
  });

  it("reads as absent without an account id", () => {
    requestAgentNetworkOnboarding("acc-1");
    expect(hasAgentNetworkOnboardingRequest(undefined)).toBe(false);
  });

  it("tells useLocalStorage readers about each change", () => {
    const listener = vi.fn();
    window.addEventListener("local-storage", listener);
    requestAgentNetworkOnboarding("acc-1");
    clearAgentNetworkOnboardingRequest("acc-1");
    window.removeEventListener("local-storage", listener);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("updates the hook as soon as it is set or cleared", () => {
    const { result } = renderHook(() =>
      useAgentNetworkOnboardingRequest("acc-1"),
    );
    expect(result.current).toBe(false);
    act(() => requestAgentNetworkOnboarding("acc-1"));
    expect(result.current).toBe(true);
    act(() => clearAgentNetworkOnboardingRequest("acc-1"));
    expect(result.current).toBe(false);
  });
});

describe("resolveOnboardingRequest", () => {
  const ready = {
    requested: true,
    cloud: true,
    ownerOrAdmin: true,
    agentNetworkEnabled: true,
    settingsLoading: false,
    hasEndpoint: false,
  };

  it("does nothing without a request", () => {
    expect(resolveOnboardingRequest({ ...ready, requested: false })).toBe(
      "none",
    );
  });

  it("opens for an owner or admin on Cloud without an endpoint", () => {
    expect(resolveOnboardingRequest(ready)).toBe("open");
  });

  it("waits for the user, the Agent Network menu and the settings", () => {
    expect(
      resolveOnboardingRequest({ ...ready, ownerOrAdmin: undefined }),
      "the logged-in user has not loaded",
    ).toBe("wait");
    expect(
      resolveOnboardingRequest({ ...ready, agentNetworkEnabled: false }),
      "the menu flag has not been saved",
    ).toBe("wait");
    expect(
      resolveOnboardingRequest({ ...ready, settingsLoading: true }),
      "the settings are still loading",
    ).toBe("wait");
  });

  it("drops a request that does not apply", () => {
    expect(
      resolveOnboardingRequest({ ...ready, cloud: false }),
      "self-hosted has no managed gateway to offer",
    ).toBe("discard");
    expect(
      resolveOnboardingRequest({ ...ready, ownerOrAdmin: false }),
      "only owners and admins run it",
    ).toBe("discard");
    expect(
      resolveOnboardingRequest({ ...ready, hasEndpoint: true }),
      "an account already set up keeps just the menu",
    ).toBe("discard");
  });
});

describe("ownDeviceConnected", () => {
  const me = "user-1";

  it("needs a connected device of this user", () => {
    expect(ownDeviceConnected([{ user_id: me, connected: true }], me)).toBe(
      true,
    );
    expect(
      ownDeviceConnected([{ user_id: me, connected: false }], me),
      "an offline device can't reach the endpoint",
    ).toBe(false);
    expect(
      ownDeviceConnected([{ user_id: "user-2", connected: true }], me),
      "someone else's device doesn't count",
    ).toBe(false);
  });

  it("is false before the user or the peers load", () => {
    expect(
      ownDeviceConnected([{ user_id: me, connected: true }], undefined),
    ).toBe(false);
    expect(ownDeviceConnected(undefined, me)).toBe(false);
  });
});
