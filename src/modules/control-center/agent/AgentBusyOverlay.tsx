"use client";

import { cn } from "@utils/helpers";
import { useEffect, useRef } from "react";
import { useAgentBusy } from "@/modules/assistant/hooks/useAgentBusy";
import {
  KeyTargetZone,
  keyTargetZone,
  swallowsKeyWhileBusy,
} from "@/modules/control-center/agent/bridge-logic";

const DIALOG = '[role="dialog"], [role="alertdialog"]';
const TEXT_ENTRY =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

const zoneOf = (target: EventTarget | null, root: Element | null): KeyTargetZone => {
  if (!(target instanceof Element)) return "elsewhere";
  return keyTargetZone({
    inModule: !!root?.contains(target),
    inDialog: !!target.closest(DIALOG),
    textEntry: !!target.closest(TEXT_ENTRY),
  });
};

export const AgentBusyOverlay = () => {
  const locked = useAgentBusy();
  const overlay = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!locked) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const zone = zoneOf(e.target, overlay.current?.parentElement ?? null);
      if (!swallowsKeyWhileBusy(e, zone)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [locked]);

  return (
    <div
      ref={overlay}
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
