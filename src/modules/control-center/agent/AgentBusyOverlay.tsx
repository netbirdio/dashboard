"use client";

import { cn } from "@utils/helpers";
import { useAgentBusy } from "@/modules/assistant/hooks/useAgentBusy";

export const AgentBusyOverlay = () => {
  const locked = useAgentBusy();

  return (
    <div
      className={cn(
        // Above the node context menu at z-[99].
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
