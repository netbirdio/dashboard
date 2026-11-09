import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearAgentNetworkOnboardingRequest,
  isEmptyAccount,
  ownConnectedDevice,
  readAgentNetworkOnboardingRequest,
  requestAgentNetworkOnboarding,
  resolveOnboardingRequest,
  startAgentNetworkOnboarding,
  useAgentNetworkOnboardingRequest,
  useOnboardingRequest,
} from "@/modules/onboarding/agent-network/existingAccountOnboarding";

afterEach(() => localStorage.clear());

describe("onboarding request marker", () => {
  it("is kept per account", () => {
    requestAgentNetworkOnboarding("acc-1");
    expect(readAgentNetworkOnboardingRequest("acc-1")).toBe("requested");
    expect(
      readAgentNetworkOnboardingRequest("acc-2"),
      "another account in the same browser has no request",
    ).toBeUndefined();
    clearAgentNetworkOnboardingRequest("acc-1");
    expect(readAgentNetworkOnboardingRequest("acc-1")).toBeUndefined();
  });

  it("reads as absent without an account id", () => {
    requestAgentNetworkOnboarding("acc-1");
    expect(readAgentNetworkOnboardingRequest(undefined)).toBeUndefined();
  });

  it("is not reset by the link once the onboarding has started", () => {
    startAgentNetworkOnboarding("acc-1");
    requestAgentNetworkOnboarding("acc-1");
    expect(readAgentNetworkOnboardingRequest("acc-1")).toBe("started");
  });

  it("reads a request stored before it could start as requested", () => {
    localStorage.setItem("netbird-agent-network-onboarding:acc-1", "yes");
    expect(readAgentNetworkOnboardingRequest("acc-1")).toBe("requested");
  });

  it("tells useLocalStorage readers about each change", () => {
    const listener = vi.fn();
    window.addEventListener("local-storage", listener);
    requestAgentNetworkOnboarding("acc-1");
    startAgentNetworkOnboarding("acc-1");
    clearAgentNetworkOnboardingRequest("acc-1");
    window.removeEventListener("local-storage", listener);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("updates the hook as soon as it is set, started or cleared", () => {
    const { result } = renderHook(() =>
      useAgentNetworkOnboardingRequest("acc-1"),
    );
    expect(result.current).toBeUndefined();
    act(() => requestAgentNetworkOnboarding("acc-1"));
    expect(result.current).toBe("requested");
    act(() => startAgentNetworkOnboarding("acc-1"));
    expect(result.current).toBe("started");
    act(() => clearAgentNetworkOnboardingRequest("acc-1"));
    expect(result.current).toBeUndefined();
  });
});

const ready = {
  marker: "requested" as const,
  cloud: true,
  ownerOrAdmin: true,
  agentNetworkEnabled: true,
  settingsLoading: false,
  hasEndpoint: false,
};

describe("resolveOnboardingRequest", () => {
  it("does nothing without a request", () => {
    expect(resolveOnboardingRequest({ ...ready, marker: undefined })).toBe(
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

  it("keeps a started onboarding open once it has an endpoint", () => {
    // The Gateway step reserves the endpoint itself, and the Provider step
    // comes after it.
    const started = { ...ready, marker: "started" as const };
    expect(resolveOnboardingRequest({ ...started, hasEndpoint: true })).toBe(
      "open",
    );
    expect(
      resolveOnboardingRequest({ ...started, settingsLoading: true }),
      "a started onboarding does not wait for the settings",
    ).toBe("open");
  });

  it("still checks the user on a started onboarding", () => {
    const started = { ...ready, marker: "started" as const };
    expect(
      resolveOnboardingRequest({ ...started, ownerOrAdmin: undefined }),
    ).toBe("wait");
    expect(resolveOnboardingRequest({ ...started, ownerOrAdmin: false })).toBe(
      "discard",
    );
    expect(resolveOnboardingRequest({ ...started, cloud: false })).toBe(
      "discard",
    );
  });
});

describe("useOnboardingRequest", () => {
  const renderRequest = (initialProps: { hasEndpoint: boolean }) =>
    renderHook(
      ({ hasEndpoint }) => {
        const marker = useAgentNetworkOnboardingRequest("acc-1");
        return useOnboardingRequest("acc-1", { ...ready, marker, hasEndpoint });
      },
      { initialProps },
    );

  it("stays open after the Gateway step sets up the endpoint", () => {
    requestAgentNetworkOnboarding("acc-1");
    const { result, rerender } = renderRequest({ hasEndpoint: false });
    expect(result.current).toBe("open");
    expect(readAgentNetworkOnboardingRequest("acc-1")).toBe("started");

    rerender({ hasEndpoint: true });
    expect(
      result.current,
      "the endpoint the flow created must not end it",
    ).toBe("open");
    expect(readAgentNetworkOnboardingRequest("acc-1")).toBe("started");
  });

  it("drops a request for an account that is already set up", () => {
    requestAgentNetworkOnboarding("acc-1");
    const { result } = renderRequest({ hasEndpoint: true });
    expect(result.current).toBe("none");
    expect(readAgentNetworkOnboardingRequest("acc-1")).toBeUndefined();
  });
});

describe("ownConnectedDevice", () => {
  const me = "user-1";
  const mine = { id: "p1", user_id: me, connected: true };

  it("finds a connected device of this user", () => {
    expect(ownConnectedDevice([mine], me)).toBe(mine);
    expect(
      ownConnectedDevice([{ ...mine, connected: false }], me),
      "an offline device can't reach the endpoint",
    ).toBeUndefined();
    expect(
      ownConnectedDevice([{ ...mine, user_id: "user-2" }], me),
      "someone else's device doesn't count",
    ).toBeUndefined();
  });

  it("finds nothing before the user or the peers load", () => {
    expect(ownConnectedDevice([mine], undefined)).toBeUndefined();
    expect(ownConnectedDevice(undefined, me)).toBeUndefined();
  });
});

describe("isEmptyAccount", () => {
  const me = "user-1";
  const all = { name: "All" };

  it("holds with only the All group and the user's own devices", () => {
    expect(isEmptyAccount([all], [], me)).toBe(true);
    expect(isEmptyAccount([all], [{ user_id: me }], me)).toBe(true);
  });

  it("does not hold once the account has something set up", () => {
    expect(
      isEmptyAccount([all, { name: "Developers" }], [], me),
      "a group of its own can be picked on the policy step",
    ).toBe(false);
    expect(
      isEmptyAccount([all], [{ user_id: "user-2" }], me),
      "someone else's device may rely on the Default policy",
    ).toBe(false);
  });

  it("does not hold without a user", () => {
    expect(isEmptyAccount([all], [], undefined)).toBe(false);
  });
});
