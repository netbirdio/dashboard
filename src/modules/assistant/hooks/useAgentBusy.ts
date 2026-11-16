"use client";

import { useSyncExternalStore } from "react";
import { agentActivityStore } from "../lib/canvas";

export function useAgentBusy(): boolean {
  return useSyncExternalStore(
    agentActivityStore.subscribe,
    agentActivityStore.getSnapshot,
    () => false,
  );
}
