import type { Edge, Node, ReactFlowInstance } from "@xyflow/react";

/**
 * The blue ring pulse that says "this is the thing that just changed" — used
 * when a resource lands in a network frame, and for everything the assistant
 * touches. The class carries the animation (globals.css) and is stripped again
 * afterwards so re-applying it re-triggers the animation.
 */
export const PULSE_MS = 2200;
/** Long enough for the flash to play out; see .cc-edge-flash in globals.css. */
export const EDGE_FLASH_MS = 1200;

type Flow = Pick<ReactFlowInstance, "setNodes" | "setEdges">;

const withClass = <T extends { className?: string }>(
  item: T,
  className: string,
): T =>
  item.className?.includes(className)
    ? item
    : { ...item, className: `${item.className ?? ""} ${className}`.trim() };

const withoutClass = <T extends { className?: string }>(
  item: T,
  className: string,
): T => {
  if (!item.className?.includes(className)) return item;
  const next = item.className
    .split(/\s+/)
    .filter((c) => c !== className)
    .join(" ");
  return { ...item, className: next || undefined };
};

/** Rings the given nodes, then clears the class so it can fire again later. */
export function pulseNodes(flow: Flow, ids: string[], className = "cc-node-pulse") {
  if (ids.length === 0) return;
  const targeted = new Set(ids);
  flow.setNodes((prev: Node[]) =>
    prev.map((n) => (targeted.has(n.id) ? withClass(n, className) : n)),
  );
  window.setTimeout(() => {
    flow.setNodes((prev: Node[]) =>
      prev.map((n) => (targeted.has(n.id) ? withoutClass(n, className) : n)),
    );
  }, PULSE_MS);
}

/** Fades a node in on arrival (see .cc-node-spawn). */
export const spawnNodes = (flow: Flow, ids: string[]) =>
  pulseNodes(flow, ids, "cc-node-spawn");

/** Brightens the given edges briefly — a connection announcing itself. */
export function flashEdges(flow: Flow, ids: string[]) {
  if (ids.length === 0) return;
  const targeted = new Set(ids);
  flow.setEdges((prev: Edge[]) =>
    prev.map((e) => (targeted.has(e.id) ? withClass(e, "cc-edge-flash") : e)),
  );
  window.setTimeout(() => {
    flow.setEdges((prev: Edge[]) =>
      prev.map((e) => (targeted.has(e.id) ? withoutClass(e, "cc-edge-flash") : e)),
    );
  }, EDGE_FLASH_MS);
}
