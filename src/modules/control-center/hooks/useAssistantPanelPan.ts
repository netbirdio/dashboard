"use client";

import { useReactFlow } from "@xyflow/react";
import { useEffect, useRef } from "react";
import { CARD_INSET, PANEL_ON_LEFT, PANEL_WIDTH } from "@/interfaces/Assistant";
import { useAssistantSidebar } from "@/modules/assistant/AssistantSidebarProvider";

const CARD_SHRINK = PANEL_WIDTH + CARD_INSET;
const MARGIN = 64;

export function useAssistantPanelPan() {
  const reactFlow = useReactFlow();
  const { reveal } = useAssistantSidebar();
  const wasRevealed = useRef(reveal);
  const pannedBy = useRef(0);

  useEffect(() => {
    if (wasRevealed.current === reveal) return;
    wasRevealed.current = reveal;

    const options = { duration: 300 }; // matches the card's own transition
    const vp = reactFlow.getViewport();

    if (!reveal) {
      const back = pannedBy.current;
      pannedBy.current = 0;
      if (back)
        void reactFlow.setViewport(
          { ...vp, x: vp.x + (PANEL_ON_LEFT ? -back : back) },
          options,
        );
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
      const left = p.x - container.left;
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
    void reactFlow.setViewport(
      { ...vp, x: vp.x + (PANEL_ON_LEFT ? shift : -shift) },
      options,
    );
  }, [reveal, reactFlow]);
}
