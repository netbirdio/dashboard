"use client";

import { useReactFlow } from "@xyflow/react";
import { useEffect, useRef } from "react";
import { CARD_INSET, PANEL_ON_LEFT, PANEL_WIDTH } from "@/interfaces/Assistant";
import { useAssistantSidebar } from "@/modules/assistant/AssistantSidebarProvider";

const CARD_SHRINK = PANEL_WIDTH + CARD_INSET;
const MARGIN = 64;
const PAN_MS = 300; // matches the card's own transition

export function useAssistantPanelPan() {
  const reactFlow = useReactFlow();
  const { reveal } = useAssistantSidebar();
  const wasRevealed = useRef(reveal);
  const pannedBy = useRef(0);
  const heading = useRef<{ x: number; until: number } | null>(null);

  useEffect(() => {
    if (wasRevealed.current === reveal) return;
    wasRevealed.current = reveal;

    const options = { duration: PAN_MS };
    const vp = reactFlow.getViewport();
    // A pan still under way has not arrived, so the next one starts from where it was going.
    // Reversing from where the viewport is would overshoot when the panel is toggled quickly.
    const x =
      heading.current && performance.now() < heading.current.until
        ? heading.current.x
        : vp.x;
    const panTo = (to: number) => {
      heading.current = { x: to, until: performance.now() + PAN_MS };
      void reactFlow.setViewport({ ...vp, x: to }, options);
    };

    if (!reveal) {
      const back = pannedBy.current;
      pannedBy.current = 0;
      if (back) panTo(x + (PANEL_ON_LEFT ? -back : back));
      return;
    }

    const container = document
      .querySelector(".react-flow")
      ?.getBoundingClientRect();
    if (!container) return;

    let min = Infinity;
    let max = -Infinity;
    for (const node of reactFlow.getNodes()) {
      const internal = reactFlow.getInternalNode(node.id);
      if (!internal) continue;
      const p = reactFlow.flowToScreenPosition(
        internal.internals.positionAbsolute,
      );
      const left = p.x - container.left + (x - vp.x);
      min = Math.min(min, left);
      max = Math.max(max, left + (node.measured?.width ?? 0) * vp.zoom);
    }
    if (min === Infinity) return;

    const needed = PANEL_ON_LEFT
      ? CARD_SHRINK - min + MARGIN
      : max - (container.width - CARD_SHRINK) + MARGIN;
    const headroom = PANEL_ON_LEFT ? container.width - max : min;
    const shift = Math.min(needed, headroom);
    if (shift <= 0) return;

    pannedBy.current = shift;
    panTo(x + (PANEL_ON_LEFT ? shift : -shift));
  }, [reveal, reactFlow]);
}
