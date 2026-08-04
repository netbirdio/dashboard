import { useSyncExternalStore } from "react";
import type { Node, ReactFlowInstance, Rect, Viewport } from "@xyflow/react";
import {
  DEFAULT_MIN_ZOOM,
  EMPTY_STATE_ZOOM,
} from "@/modules/control-center/utils/layouts";

// Reusable "dive / fly-out" scene transition for the control-center canvas.
//
// A single canvas can't crossfade, so the swap happens in a ~2-frame
// invisible window:
//   1. camera ACCELERATES (easeInHalf) while the canvas fades out — at max
//      speed exactly when opacity hits 0
//   2. scene swapped while invisible; camera teleported to the reveal start
//   3. canvas fades in while the camera DECELERATES (easeOutHalf) into its
//      final viewport
// The two half-eases stitch into one continuous ease-in-out zoom across the
// swap. Callers describe the pre-swap motion, swap, and final viewport;
// fades/timing/velocity are owned here so all transitions feel identical.

// Two halves of ONE zoom (see above).
export const easeInHalf = (t: number) => t * t;
export const easeOutHalf = (t: number) => 1 - (1 - t) * (1 - t);

// Timing (ms). FADE_OUT and the pre-swap motion share a duration so the
// motion is still at full speed when the canvas turns invisible.
const FADE_OUT = 200;
const PRE_SWAP_MOTION = 240;
const SWAP_AT = 210;
const FADE_IN_DELAY = 30;
// Exported so out-of-pane overlays (e.g. drill-down empty states) can grow
// in with the exact same fade/zoom timing and curve as the canvas reveal.
export const FADE_IN = 220;
export const REVEAL = 450;
// "in" direction grow-in start scale (mirrors runCanvasTransition's default
// growFrom for direction "in").
export const GROW_IN_FROM = 0.7;

// Matches the app-wide fit parameters (live view init, drill fits).
export const CANVAS_FIT = { padding: 0.1, maxZoom: 0.8 } as const;

// A node's rect for transition targets (style size wins — frames carry their
// size there — falling back to the measured DOM size).
export const getNodeRect = (node?: Node | null): Rect | null =>
  node
    ? {
        x: node.position.x,
        y: node.position.y,
        width: Number(node.style?.width ?? node.measured?.width ?? 400),
        height: Number(node.style?.height ?? node.measured?.height ?? 300),
      }
    : null;

let transitionActive = false;
const transitionListeners = new Set<() => void>();
const setTransitionActive = (value: boolean) => {
  if (transitionActive === value) return;
  transitionActive = value;
  transitionListeners.forEach((l) => l());
};
// View-init effects call their own fitView after a rebuild — during a
// transition the reveal owns the camera, so those fits must be skipped.
export const isCanvasTransitionActive = () => transitionActive;

// Reactive subscription for React components (overlays outside the canvas
// pane, which the transition's opacity fade doesn't cover, use this to stay
// hidden until the dive/fly-out has settled).
export const useCanvasTransitionActive = () =>
  useSyncExternalStore(
    (cb) => {
      transitionListeners.add(cb);
      return () => transitionListeners.delete(cb);
    },
    isCanvasTransitionActive,
    isCanvasTransitionActive,
  );

export type CanvasTransitionOptions = {
  // Pre-swap camera motion. "in" dives into `target` (an inner rect of it);
  // "out" pulls straight back from the current viewport.
  direction: "in" | "out";
  target?: Rect | null;
  // Swap the scene while invisible (hide/show/replace nodes, change views).
  swap: () => void;
  // Where the camera ends. A viewport → the reveal starts at
  // `growFrom · final` and decelerates into it (nodes grow in). null/absent
  // → `reveal` is called instead (must be a decelerating camera move, e.g.
  // fitView with easeOutHalf) after an optional `revealFrom` teleport.
  finalViewport?: () => Viewport | null;
  // Teleport target for the reveal start when finalViewport isn't known
  // (e.g. a close-up on a frame the camera then flies out of).
  revealFrom?: () => Rect | null;
  reveal?: () => void;
  // Reveal start scale relative to the final viewport. Defaults by
  // direction: "in" grows the new scene in (0.7 → 1), "out" starts CLOSE
  // and settles outward (1.45 → 1) — the back motion must mirror the dive,
  // zooming out of the frame, not growing the overview in.
  growFrom?: number;
  onDone?: () => void;
};

export function runCanvasTransition(
  reactFlow: ReactFlowInstance,
  {
    direction,
    target,
    swap,
    finalViewport,
    revealFrom,
    reveal,
    growFrom = direction === "in" ? 0.7 : 1.45,
    onDone,
  }: CanvasTransitionOptions,
) {
  const pane = document.querySelector<HTMLElement>(".react-flow");
  if (!pane) {
    // No pane to fade — degrade to an instant swap + reveal.
    swap();
    reveal?.();
    onDone?.();
    return;
  }

  setTransitionActive(true);

  // 1. Fade out + accelerating camera motion.
  pane.style.transition = `opacity ${FADE_OUT}ms ease-in`;
  // Reflow so the transition reliably animates (setting transition and
  // opacity in the same frame can skip it — the swap would happen visibly).
  void pane.offsetWidth;
  pane.style.opacity = "0";

  if (direction === "in" && target) {
    // Dive toward the target's center (an inner rect → real zoom-in).
    reactFlow.fitBounds(
      {
        x: target.x + target.width * 0.25,
        y: target.y + target.height * 0.25,
        width: target.width * 0.5,
        height: target.height * 0.5,
      },
      { duration: PRE_SWAP_MOTION, ease: easeInHalf },
    );
  } else {
    const { zoom } = reactFlow.getViewport();
    void reactFlow.zoomTo(zoom * (direction === "in" ? 1.8 : 0.55), {
      duration: PRE_SWAP_MOTION,
      ease: easeInHalf,
    });
  }

  // A fit viewport over the currently visible top-level nodes — the default
  // grow-in destination when the caller doesn't provide one (e.g. live view
  // rebuilds where the new scene only exists after the swap).
  const computeSceneViewport = (): Viewport | null => {
    const visible = reactFlow
      .getNodes()
      .filter((n) => !n.hidden && !n.parentId);
    if (visible.length === 0) return null;
    const b = reactFlow.getNodesBounds(visible);
    const W = pane.clientWidth;
    const H = pane.clientHeight;
    const bw = Math.max(b.width, 1);
    const bh = Math.max(b.height, 1);
    const pad = 1 - 2 * CANVAS_FIT.padding;
    // Clamped to the canvas min zoom — setViewport doesn't clamp (unlike
    // user zooming), so a huge scene must not fly out past the zoom limit.
    const zoom = Math.max(
      Math.min((W * pad) / bw, (H * pad) / bh, CANVAS_FIT.maxZoom),
      DEFAULT_MIN_ZOOM,
    );
    return {
      zoom,
      x: W / 2 - (b.x + bw / 2) * zoom,
      y: H / 2 - (b.y + bh / 2) * zoom,
    };
  };

  const placeAtGrowStart = (finalVp: Viewport) => {
    const k = growFrom;
    const cx = pane.clientWidth / 2;
    const cy = pane.clientHeight / 2;
    reactFlow.setViewport(
      {
        zoom: finalVp.zoom * k,
        x: cx - (cx - finalVp.x) * k,
        y: cy - (cy - finalVp.y) * k,
      },
      { duration: 0 },
    );
  };

  // 2. Invisible swap + reveal-start teleport.
  setTimeout(() => {
    swap();

    const finalVp = finalViewport?.() ?? null;
    if (finalVp) {
      placeAtGrowStart(finalVp);
    } else {
      const from = revealFrom?.();
      if (from) {
        reactFlow.fitBounds(
          {
            x: from.x + from.width * 0.25,
            y: from.y + from.height * 0.25,
            width: from.width * 0.5,
            height: from.height * 0.5,
          },
          { duration: 0 },
        );
      }
    }

    // 3. Fade in + decelerating reveal.
    setTimeout(() => {
      const autoReveal = !finalVp && !reveal && !revealFrom;
      // Late scene viewport: for view rebuilds the new nodes only exist (and
      // are measured) after the swap committed — compute the grow-in
      // destination now so ALL callers share the same motion.
      const lateVp = autoReveal ? computeSceneViewport() : null;
      // No nodes to frame (e.g. an empty network's drilled view) — settle at
      // the shared empty-state camera instead of leaving the camera at the
      // zoomed-in dive position (which read as "too zoomed in").
      const emptyVp =
        autoReveal && !lateVp
          ? {
              zoom: EMPTY_STATE_ZOOM,
              x: pane.clientWidth / 2,
              y: pane.clientHeight / 2,
            }
          : null;
      const growVp = lateVp ?? emptyVp;
      if (growVp) placeAtGrowStart(growVp);

      pane.style.transition = `opacity ${FADE_IN}ms ease-out`;
      pane.style.opacity = "1";
      const destination = finalVp ?? growVp;
      if (destination) {
        void reactFlow.setViewport(destination, {
          duration: REVEAL,
          ease: easeOutHalf,
        });
      } else if (reveal) {
        reveal();
      } else {
        void reactFlow.fitView({
          ...CANVAS_FIT,
          duration: REVEAL,
          ease: easeOutHalf,
        });
      }
      onDone?.();
      // Ungate out-of-pane overlays (the empty states) once the canvas is
      // fully opaque again — they're outside the pane, so appearing while it's
      // still faint reads as a flash. They then ease in with a short fade
      // (animate-in) over the solid canvas as the reveal zoom settles, so it's
      // neither a flash nor a laggy late pop-in.
      setTimeout(() => setTransitionActive(false), FADE_IN);
    }, FADE_IN_DELAY);
  }, SWAP_AT);
}

// ---------------------------------------------------------------------------
// One-liner facades — THE drill-down behavior, ready for any view.
// ---------------------------------------------------------------------------

// Drill INTO something: dives toward the clicked node (or zooms from the
// center when there's none — dropdown picks), swaps the scene invisibly and
// grows the new scene in.
//   drillInto(reactFlow, clickedNode, () => switchToDetailView());
export const drillInto = (
  reactFlow: ReactFlowInstance,
  target: Node | Rect | null | undefined,
  swap: () => void,
  options?: Partial<CanvasTransitionOptions>,
) =>
  runCanvasTransition(reactFlow, {
    direction: "in",
    target:
      target && "position" in target ? getNodeRect(target) : target ?? null,
    swap,
    ...options,
  });

// Drill back OUT: zooms outward while fading, swaps invisibly, then grows
// the parent scene in (or flies out of `from`, e.g. the frame the drill
// came from, when given).
//   drillOutOf(reactFlow, () => switchToOverview());
export const drillOutOf = (
  reactFlow: ReactFlowInstance,
  swap: () => void,
  from?: Node | Rect | null,
  options?: Partial<CanvasTransitionOptions>,
) =>
  runCanvasTransition(reactFlow, {
    direction: "out",
    swap,
    revealFrom: from
      ? () => ("position" in from ? getNodeRect(from) : from)
      : undefined,
    ...options,
  });
