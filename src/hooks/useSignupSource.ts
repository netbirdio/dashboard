import { useEffect } from "react";

export const SIGNUP_SOURCE_LOCAL_STORAGE_KEY = "netbird-signup-source";
export const AGENT_NETWORK_SIGNUP_SOURCE = "netbird.ai";

/**
 * Store the signup source query parameter into localStorage so it survives
 * the OIDC redirect and can be applied once the account is available.
 */
export function useSignupSource() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const source = params.get("source");

    if (source === AGENT_NETWORK_SIGNUP_SOURCE) {
      try {
        localStorage.setItem(SIGNUP_SOURCE_LOCAL_STORAGE_KEY, source);
      } catch (e) {}
    }
  }, []);
}
