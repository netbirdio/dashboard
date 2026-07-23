import { useEffect, useRef } from "react";
import {
  useCanvasState,
  useControlCenterUI,
} from "@/modules/control-center/ControlCenterContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";

// Wires the canvas drill-downs into the browser history: entering a level
// that shows a back arrow pushes one history entry (same URL, marker state),
// so the browser's Back button exits that level — through the SAME path the
// UI back arrow uses, so the usual transition plays. Exiting via the UI
// consumes the pushed entry silently (history.back with a suppressed
// popstate), keeping the history stack balanced.
//
// Levels (each owns at most one entry; they're mutually exclusive today but
// tracked as a stack so nesting keeps working):
// - network: live single-network view / draft drill-down — one combined
//   level, they mirror each other across mode switches. Switching networks
//   while drilled reuses the entry.
// - user-peer: user view → clicked a peer (peer view with the "back to
//   user" breadcrumb via previousSelectedUser).
type DrillLevel = {
  key: string;
  active: boolean;
  exit: () => void;
};

export function useDrillDownBrowserHistory() {
  const { selectedNetwork, previousSelectedUser } = useCanvasState();
  const { onNetworkSelect, onForceSingleUserView } = useControlCenterUI();
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
    {
      key: "user-peer",
      active: !isDraft && previousSelectedUser !== "",
      exit: () => onForceSingleUserView(previousSelectedUser),
    },
  ];

  // Latest closures for the popstate listener (subscribed once).
  const levelsRef = useRef(levels);
  levelsRef.current = levels;

  const prevActiveRef = useRef<Record<string, boolean>>({});
  // Keys of the levels whose history entries WE pushed, in push order.
  const ownedStackRef = useRef<string[]>([]);
  // Counts popstates caused by our own history.back() calls.
  const suppressPopRef = useRef(0);

  const activeSignature = levels.map((l) => (l.active ? "1" : "0")).join("");
  useEffect(() => {
    levelsRef.current.forEach((level) => {
      const prev = prevActiveRef.current[level.key] ?? false;
      prevActiveRef.current[level.key] = level.active;
      const owned = ownedStackRef.current.includes(level.key);
      if (level.active && !prev && !owned) {
        window.history.pushState({ controlCenterDrill: level.key }, "");
        ownedStackRef.current.push(level.key);
        return;
      }
      if (!level.active && prev && owned) {
        // Exited through the UI — take our entry back off the stack.
        ownedStackRef.current = ownedStackRef.current.filter(
          (k) => k !== level.key,
        );
        suppressPopRef.current += 1;
        window.history.back();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSignature]);

  useEffect(() => {
    const onPopState = () => {
      if (suppressPopRef.current > 0) {
        suppressPopRef.current -= 1;
        return;
      }
      const key = ownedStackRef.current.pop();
      if (!key) return;
      // Mark inactive BEFORE exiting — the state change must not re-consume
      // the entry the browser just popped.
      prevActiveRef.current[key] = false;
      levelsRef.current.find((l) => l.key === key)?.exit();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // Unmounting (page navigation) while drilled leaves the pushed entry in
    // the stack, but it points at the same URL — harmless.
  }, []);
}
