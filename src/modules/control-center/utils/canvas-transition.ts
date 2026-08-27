import { useSyncExternalStore } from "react";
import type { Node, ReactFlowInstance, Rect, Viewport } from "@xyflow/react";
import {
  DEFAULT_MIN_ZOOM,
  EMPTY_STATE_ZOOM,
} from "@/modules/control-center/utils/layouts";

// Dive / fly-out scene transition for the canvas. A single canvas can't
// crossfade, so the scene swaps inside a ~2-frame invisible window and the two
// half-eases stitch into one ease-in-out zoom.

export const easeInHalf = (t: number) => t * t;
export const easeOutHalf = (t: number) => 1 - (1 - t) * (1 - t);

// Give the invisible swap a couple of real frames so a heavy swap drains while
// masked instead of stealing the reveal tween's opening frames.
const afterSwapSettled = (cb: () => void) => {
  if (typeof requestAnimationFrame !== "function") {
    setTimeout(cb, FADE_IN_DELAY);
    return;
  }
  let fired = false;
  const run = () => {
    if (fired) return;
    fired = true;
    cb();
  };
  let frames = 0;
  const tick = () => {
    if (fired) return;
    if (frames++ >= REVEAL_WAIT_FRAMES) run();
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  setTimeout(run, REVEAL_WAIT_MAX_MS);
};

// The fade-out and the pre-swap motion overlap so the motion is still at full
// speed when the canvas turns invisible.
const FADE_OUT = 200;
const PRE_SWAP_MOTION = 240;
const SWAP_AT = 210;
// Fallback settle delay when rAF is unavailable (SSR).
const FADE_IN_DELAY = 30;
const REVEAL_WAIT_FRAMES = 2;
const REVEAL_WAIT_MAX_MS = 200;
export const FADE_IN = 220;
export const REVEAL = 450;

// Must match the app-wide fit parameters (live view init, drill fits).
export const CANVAS_FIT = { padding: 0.1, maxZoom: 0.8 } as const;

// Style size wins over the measured DOM size: frames carry their size there.
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
// The reveal owns the camera, so view-init fitViews must be skipped.
export const isCanvasTransitionActive = () => transitionActive;

// Overlays outside the canvas pane aren't covered by the opacity fade.
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
  // "in" dives into `target`; "out" pulls back from the current viewport.
  direction: "in" | "out";
  target?: Rect | null;
  // Runs while the canvas is invisible.
  swap: () => void;
  // Where the camera ends. Absent → `reveal` runs instead (must decelerate).
  finalViewport?: () => Viewport | null;
  // Teleport target for the reveal start when finalViewport isn't known.
  revealFrom?: () => Rect | null;
  reveal?: () => void;
  // Reveal start scale relative to the final viewport ("out" starts CLOSE).
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
    swap();
    reveal?.();
    onDone?.();
    return;
  }

  setTransitionActive(true);

  // 1. Fade out + accelerating camera motion.
  pane.style.transition = `opacity ${FADE_OUT}ms ease-in`;
  // Reflow, or setting transition and opacity in one frame can skip the fade.
  void pane.offsetWidth;
  pane.style.opacity = "0";

  if (direction === "in" && target) {
    // An inner rect of the target makes this a real zoom-in.
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
    // setViewport doesn't clamp zoom the way user zooming does.
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
    afterSwapSettled(() => {
      const autoReveal = !finalVp && !reveal && !revealFrom;
      // View rebuilds only have measured nodes once the swap committed.
      const lateVp = autoReveal ? computeSceneViewport() : null;
      // With no nodes to frame, settle at the empty-state camera.
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
      // Ungate the out-of-pane overlays only once the canvas is fully opaque.
      setTimeout(() => setTransitionActive(false), FADE_IN);
    });
  }, SWAP_AT);
}

// Dives toward the clicked node, or zooms from the center when there is none.
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

// Zooms outward, then grows the parent scene in (or flies out of `from`).
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
