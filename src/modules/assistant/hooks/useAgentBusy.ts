"use client";

import { useSyncExternalStore } from "react";
import { agentActivityStore } from "../lib/canvas";

/** Whether the assistant is writing to the control-center canvas right now. */
export function useAgentBusy(): boolean {
  return useSyncExternalStore(
    agentActivityStore.subscribe,
    agentActivityStore.getSnapshot,
    () => false,
  );
}
