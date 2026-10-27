"use client";

import { useEffect, useRef, useState } from "react";
import { ACCESS_PATH } from "../lib/contract";

/**
 * Whether the assistant is there for this user: the dashboard names a service,
 * and the service, asked with the user's headers, enables the assistant for
 * their account. False hides the assistant entirely. Without a service or
 * without a signed-in user there is nothing to ask, and nothing is asked.
 *
 * One check per page load, and quiet about it: a service that is down, or an
 * account that is not enabled, is the common case for most deployments, so the
 * answer is simply "no" with no retry, no polling and nothing surfaced to the
 * user. The next page load asks again.
 */
export function useAssistantAvailable(host: string, headers: (() => Promise<Record<string, string>>) | undefined): boolean {
  const [available, setAvailable] = useState(false);
  // Read when the check runs, so a refreshed token is used without rerunning it.
  const headersRef = useRef(headers);
  headersRef.current = headers;
  const signedIn = headers !== undefined;

  useEffect(() => {
    if (!host || !signedIn) {
      setAvailable(false);
      return;
    }
    let cancelled = false;
    const check = async () => {
      let ok = false;
      try {
        const auth = headersRef.current;
        if (!auth) return;
        const res = await fetch(`${host}${ACCESS_PATH}`, { method: "GET", headers: await auth(), redirect: "error" });
        ok = res.ok;
      } catch {
        ok = false;
      }
      if (!cancelled) setAvailable(ok);
    };
    void check();
    return () => {
      cancelled = true;
    };
  }, [host, signedIn]);

  return available;
}
