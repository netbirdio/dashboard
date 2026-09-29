import { useSyncExternalStore } from "react";
import type { Peer } from "@/interfaces/Peer";

// An account that exists already reaches the Agent Network onboarding through
// the netbird.ai link rather than a signup. The request is kept per account
// in this browser, because the account itself has no field that says which
// onboarding is pending, and the signup source key is cleared right after the
// Agent Network menu is saved.
const REQUEST_KEY_PREFIX = "netbird-agent-network-onboarding:";
// The event useLocalStorage listens to, so every reader refreshes at once.
const LOCAL_STORAGE_EVENT = "local-storage";

const requestKey = (accountId: string) => REQUEST_KEY_PREFIX + accountId;

export function requestAgentNetworkOnboarding(accountId: string) {
  try {
    localStorage.setItem(requestKey(accountId), "requested");
    window.dispatchEvent(new Event(LOCAL_STORAGE_EVENT));
  } catch (e) {}
}

export function clearAgentNetworkOnboardingRequest(accountId: string) {
  try {
    localStorage.removeItem(requestKey(accountId));
    window.dispatchEvent(new Event(LOCAL_STORAGE_EVENT));
  } catch (e) {}
}

export function hasAgentNetworkOnboardingRequest(accountId?: string): boolean {
  if (!accountId || typeof window === "undefined") return false;
  try {
    return localStorage.getItem(requestKey(accountId)) !== null;
  } catch (e) {
    return false;
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

// useAgentNetworkOnboardingRequest reports whether this browser holds an
// onboarding request for the account, and updates as soon as it is set or
// cleared.
export function useAgentNetworkOnboardingRequest(accountId?: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hasAgentNetworkOnboardingRequest(accountId),
    () => false,
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

// resolveOnboardingRequest decides what an existing account's request leads
// to. It opens for an owner or admin on Cloud once the Agent Network menu is
// saved, and only while the account has no Agent Network endpoint: an account
// that already set Agent Network up just keeps the menu.
export function resolveOnboardingRequest(input: {
  requested: boolean;
  cloud: boolean;
  // Undefined until the logged-in user has loaded.
  ownerOrAdmin?: boolean;
  agentNetworkEnabled: boolean;
  settingsLoading: boolean;
  hasEndpoint: boolean;
}): OnboardingRequest {
  if (!input.requested) return "none";
  if (!input.cloud) return "discard";
  if (input.ownerOrAdmin === undefined) return "wait";
  if (!input.ownerOrAdmin) return "discard";
  if (!input.agentNetworkEnabled || input.settingsLoading) return "wait";
  return input.hasEndpoint ? "discard" : "open";
}

// ownDeviceConnected reports whether the user has a connected device. An
// existing account has other people's devices too, so any peer at all would
// not show that this user can reach the endpoint.
export function ownDeviceConnected(
  peers: Pick<Peer, "user_id" | "connected">[] | undefined,
  userId: string | undefined,
): boolean {
  if (!userId) return false;
  return (peers ?? []).some((p) => p.user_id === userId && p.connected);
}
