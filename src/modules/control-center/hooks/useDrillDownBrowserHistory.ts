import { useEffect, useRef } from "react";
import {
  useCanvasState,
  useControlCenterUI,
} from "@/modules/control-center/contexts/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";

// Each drill-down level pushes one history entry (same URL, marker state) so
// browser Back exits it through the same path as the UI back arrow. A UI exit
// consumes that entry with a suppressed history.back to keep the stack balanced.
type DrillLevel = {
  key: string;
  active: boolean;
  exit: () => void;
};

export function useDrillDownBrowserHistory() {
  const { selectedNetwork } = useCanvasState();
  const { onNetworkSelect } = useControlCenterUI();
  const { isDraft, drillDownNetworkNodeId, setDrillDownNetworkNodeId } =
    useDraftMode();

  const levels: DrillLevel[] = [
    {
      key: "network",
      active: !!(isDraft ? drillDownNetworkNodeId : selectedNetwork),
      exit: () => {
        if (isDraft) setDrillDownNetworkNodeId(null);
        else onNetworkSelect("");
      },
    },
  ];

  // Latest closures for the popstate listener (subscribed once).
  const levelsRef = useRef(levels);
  levelsRef.current = levels;

  const prevActiveRef = useRef<Record<string, boolean>>({});
  const ownedStackRef = useRef<string[]>([]);
  // Counts popstates caused by our own history.back() calls.
  const suppressPopRef = useRef(0);
  // Mode switches briefly deactivate the level across commits, and consuming
  // the entry then races the async history.back(). A reactivation reuses it.
  const pendingConsumeRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});

  const activeSignature = levels.map((l) => (l.active ? "1" : "0")).join("");
  useEffect(() => {
    levelsRef.current.forEach((level) => {
      const prev = prevActiveRef.current[level.key] ?? false;
      prevActiveRef.current[level.key] = level.active;
      const owned = ownedStackRef.current.includes(level.key);
      if (level.active && !prev) {
        const pending = pendingConsumeRef.current[level.key];
        if (pending) {
          // Transient deactivation from a mode switch: keep the entry.
          clearTimeout(pending);
          delete pendingConsumeRef.current[level.key];
          return;
        }
        if (!owned) {
          window.history.pushState({ controlCenterDrill: level.key }, "");
          ownedStackRef.current.push(level.key);
        }
        return;
      }
      if (!level.active && prev && owned && !pendingConsumeRef.current[level.key]) {
        // Exited through the UI: take our entry back off the stack.
        pendingConsumeRef.current[level.key] = setTimeout(() => {
          delete pendingConsumeRef.current[level.key];
          ownedStackRef.current = ownedStackRef.current.filter(
            (k) => k !== level.key,
          );
          suppressPopRef.current += 1;
          window.history.back();
        }, 150);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSignature]);

  useEffect(() => {
    // The record object is never reassigned, so capturing it here keeps the
    // cleanup honest about which timers it clears.
    const pendingTimers = pendingConsumeRef.current;
    const onPopState = () => {
      if (suppressPopRef.current > 0) {
        suppressPopRef.current -= 1;
        return;
      }
      const key = ownedStackRef.current.pop();
      if (!key) return;
      // The browser just consumed this entry itself; a consume timer still
      // scheduled for it would back past it into foreign history.
      const pending = pendingTimers[key];
      if (pending) {
        clearTimeout(pending);
        delete pendingTimers[key];
      }
      // Mark inactive BEFORE exiting so the state change doesn't re-consume
      // the entry the browser just popped.
      prevActiveRef.current[key] = false;
      levelsRef.current.find((l) => l.key === key)?.exit();
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      // A consume timer firing after unmount would undo whatever navigation
      // caused the unmount.
      Object.keys(pendingTimers).forEach((key) => {
        clearTimeout(pendingTimers[key]);
        delete pendingTimers[key];
      });
    };
    // Unmounting while drilled leaves the entry, but it points at the same URL.
  }, []);
}
