import { useEffect, useSyncExternalStore } from "react";
import type { Peer } from "@/interfaces/Peer";

// An account that exists already reaches the Agent Network onboarding through
// the netbird.ai link rather than a signup. The request is kept per account
// in this browser, because the account itself has no field that says which
// onboarding is pending, and the signup source key is cleared right after the
// Agent Network menu is saved.
const REQUEST_KEY_PREFIX = "netbird-agent-network-onboarding:";
// The event useLocalStorage listens to, so every reader refreshes at once.
const LOCAL_STORAGE_EVENT = "local-storage";

// A request is "requested" until the onboarding opens and "started" after.
// Once started, the endpoint its own Gateway step sets up must not end it.
export type OnboardingRequestMarker = "requested" | "started";

const requestKey = (accountId: string) => REQUEST_KEY_PREFIX + accountId;

function writeMarker(accountId: string, marker: OnboardingRequestMarker) {
  try {
    localStorage.setItem(requestKey(accountId), marker);
    window.dispatchEvent(new Event(LOCAL_STORAGE_EVENT));
  } catch (e) {}
}

// requestAgentNetworkOnboarding records the request, keeping one that has
// already started, so opening the link again mid-flow doesn't reset it.
export function requestAgentNetworkOnboarding(accountId: string) {
  if (readAgentNetworkOnboardingRequest(accountId)) return;
  writeMarker(accountId, "requested");
}

export function startAgentNetworkOnboarding(accountId: string) {
  writeMarker(accountId, "started");
}

export function clearAgentNetworkOnboardingRequest(accountId: string) {
  try {
    localStorage.removeItem(requestKey(accountId));
    window.dispatchEvent(new Event(LOCAL_STORAGE_EVENT));
  } catch (e) {}
}

export function readAgentNetworkOnboardingRequest(
  accountId?: string,
): OnboardingRequestMarker | undefined {
  if (!accountId || typeof window === "undefined") return undefined;
  try {
    const value = localStorage.getItem(requestKey(accountId));
    if (value === null) return undefined;
    return value === "started" ? "started" : "requested";
  } catch (e) {
    return undefined;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(LOCAL_STORAGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(LOCAL_STORAGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// useAgentNetworkOnboardingRequest reports the request this browser holds for
// the account, and updates as soon as it is set, started or cleared.
export function useAgentNetworkOnboardingRequest(
  accountId?: string,
): OnboardingRequestMarker | undefined {
  return useSyncExternalStore(
    subscribe,
    () => readAgentNetworkOnboardingRequest(accountId),
    () => undefined,
  );
}

export type OnboardingRequest =
  // No request in this browser.
  | "none"
  // Something the decision needs is still loading.
  | "wait"
  | "open"
  // The request does not apply; drop it.
  | "discard";

type OnboardingRequestInput = {
  marker?: OnboardingRequestMarker;
  cloud: boolean;
  // Undefined until the logged-in user has loaded.
  ownerOrAdmin?: boolean;
  agentNetworkEnabled: boolean;
  settingsLoading: boolean;
  hasEndpoint: boolean;
};

// resolveOnboardingRequest decides what an existing account's request leads
// to. It opens for an owner or admin on Cloud once the Agent Network menu is
// saved, and only while the account has no Agent Network endpoint: an account
// that already set Agent Network up just keeps the menu. The endpoint is
// checked before the onboarding opens, never after.
export function resolveOnboardingRequest(
  input: OnboardingRequestInput,
): OnboardingRequest {
  if (!input.marker) return "none";
  if (!input.cloud) return "discard";
  if (input.ownerOrAdmin === undefined) return "wait";
  if (!input.ownerOrAdmin) return "discard";
  if (!input.agentNetworkEnabled) return "wait";
  if (input.marker === "started") return "open";
  if (input.settingsLoading) return "wait";
  return input.hasEndpoint ? "discard" : "open";
}

// useOnboardingRequest resolves an existing account's request and keeps the
// stored request in step with it: marked started once the onboarding opens,
// dropped when it does not apply.
export function useOnboardingRequest(
  accountId: string | undefined,
  input: OnboardingRequestInput,
): OnboardingRequest {
  const request = resolveOnboardingRequest(input);
  const { marker } = input;

  useEffect(() => {
    if (!accountId) return;
    if (request === "discard") {
      clearAgentNetworkOnboardingRequest(accountId);
    } else if (request === "open" && marker === "requested") {
      startAgentNetworkOnboarding(accountId);
    }
  }, [accountId, request, marker]);

  return request;
}

// ownConnectedDevice finds a connected device of the user. An existing account
// has other people's devices too, so any peer at all would not show that this
// user can reach the endpoint.
export function ownConnectedDevice<
  T extends Pick<Peer, "user_id" | "connected">,
>(peers: T[] | undefined, userId: string | undefined): T | undefined {
  if (!userId) return undefined;
  return (peers ?? []).find((p) => p.user_id === userId && p.connected);
}
