/**
 * Is the assistant server actually there?
 *
 * The assistant is deployed separately from the dashboard, so `assistantEnabled`
 * alone isn't enough — the configured origin may be unreachable, not yet rolled
 * out, or unready (its `/readyz` also covers Postgres and JWKS). Everything that
 * surfaces the assistant is gated on this so a down server means no Ask button
 * and no chat panel, rather than a launcher that opens onto network errors.
 *
 * Starts out `false`, so nothing flashes in and back out while the probe runs.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import loadAssistantConfig from "./assistantConfig";

const PROBE_TIMEOUT_MS = 4000;

export function useAssistantAvailability(): boolean {
  const { origin, enabled } = useMemo(() => loadAssistantConfig(), []);
  const [reachable, setReachable] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const probe = async () => {
      try {
        const res = await fetch(`${origin}/readyz`, {
          signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        });
        if (!cancelled) setReachable(res.ok);
      } catch {
        // Unreachable, blocked by CORS, or timed out — all "not available".
        if (!cancelled) setReachable(false);
      }
    };

    void probe();

    // The dashboard is a long-lived SPA: a server that goes down (or comes back)
    // mid-session shouldn't need a reload to be noticed. Re-checking when the
    // tab regains focus keeps that cheap — no polling in the background.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void probe();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, origin]);

  return enabled && reachable;
}

export default useAssistantAvailability;
