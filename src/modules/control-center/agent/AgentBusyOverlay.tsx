"use client";

import { useAgentBusy } from "@netbird/assistant-react";
import { cn } from "@utils/helpers";

/**
 * What the control centre looks like while the assistant is writing to it: dimmed
 * a little, and inert.
 *
 * Says nothing on purpose. The assistant panel is right there, naming each step
 * as it runs, and a second commentary floating over the canvas was one more thing
 * to read in the place the user is trying to watch.
 *
 * Blocking input is the point, and it covers the WHOLE module — canvas, header,
 * toolbar, components panel, Review & Deploy, Cancel. The assistant places,
 * connects and re-arranges across several steps; a drag lands in the middle of
 * its own layout, and Cancel mid-build tears down the draft it is still writing
 * to. Keyboard shortcuts are suppressed alongside this (see
 * useControlCenterShortcuts) — a scrim stops the pointer, not a keydown listener.
 *
 * Deliberately NOT covered: the assistant panel itself. It is mounted outside
 * this module, and it is where the user stops the turn — locking it would leave
 * them with no way out.
 *
 * Mounted by ControlCenterUIProvider, whose container spans the module. It used
 * to live inside <ReactFlow>, which only ever covered the pane.
 */
export const AgentBusyOverlay = () => {
  const locked = useAgentBusy();

  return (
    <div
      // Always mounted, faded out when idle: mounting on demand made it pop in
      // without a transition.
      className={cn(
        // Above everything in the module — the components panel sits at z-30 and
        // a node's context menu at z-[99].
        "absolute inset-0 z-[100] bg-nb-gray-950/25 transition-opacity duration-200",
        locked
          ? "opacity-100 pointer-events-auto cursor-progress"
          : "opacity-0 pointer-events-none",
      )}
      data-testid={"cc-agent-busy"}
      data-busy={locked ? "true" : "false"}
      aria-hidden={!locked}
    />
  );
};
