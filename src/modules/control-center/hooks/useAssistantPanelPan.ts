"use client";

import { useReactFlow } from "@xyflow/react";
import { useEffect, useRef } from "react";
import { CARD_INSET, PANEL_ON_LEFT, PANEL_WIDTH } from "@/interfaces/Assistant";
import { useAssistantSidebar } from "@/modules/assistant/AssistantSidebarProvider";

/**
 * The dashboard card shrinks by this much when the assistant panel is revealed
 * (`DashboardLayout`: one margin becomes the panel width, the other the inset).
 */
const CARD_SHRINK = PANEL_WIDTH + CARD_INSET;

/** Breathing room kept between the graph and the edge it was panned away from. */
const MARGIN = 64;

/**
 * Pans the canvas out of the assistant panel's way, the same way the group panel
 * does: opening the panel takes `CARD_SHRINK` off the canvas' width, so anything
 * in that strip would just get clipped.
 *
 * The pan is only as far as it has to be, and never further than the empty space
 * on the opposite side — a graph sitting on the left doesn't move at all, and a
 * graph too wide to fit either way is left where it is rather than trading one
 * clipped end for the other. Closing pans back by exactly what was taken, so a
 * toggle round-trip leaves the viewport where it started.
 */
export function useAssistantPanelPan() {
  const reactFlow = useReactFlow();
  const { reveal } = useAssistantSidebar();
  const wasRevealed = useRef(reveal);
  const pannedBy = useRef(0);

  useEffect(() => {
    if (wasRevealed.current === reveal) return;
    wasRevealed.current = reveal;

    // Matches the card's own transition, so canvas and card move as one.
    const options = { duration: 300 };
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

    // Measured before the card starts shrinking, i.e. still the full width.
    const container = document
      .querySelector(".react-flow")
      ?.getBoundingClientRect();
    if (!container) return;

    // Graph bounds in container-relative screen px.
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

    // How far into the vanishing strip the graph reaches, and how much room it
    // has to give on the other side.
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
