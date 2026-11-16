import type { Edge, Node, ReactFlowInstance } from "@xyflow/react";

// Both must outlast the matching animations in globals.css.
export const PULSE_MS = 2200;
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

export function pulseNodes(flow: Flow, ids: string[], className = "cc-node-pulse") {
  if (ids.length === 0) return;
  const targeted = new Set(ids);
  flow.setNodes((prev: Node[]) =>
    prev.map((n) => (targeted.has(n.id) ? withClass(n, className) : n)),
  );
  globalThis.setTimeout(() => {
    flow.setNodes((prev: Node[]) =>
      prev.map((n) => (targeted.has(n.id) ? withoutClass(n, className) : n)),
    );
  }, PULSE_MS);
}

export const spawnNodes = (flow: Flow, ids: string[]) =>
  pulseNodes(flow, ids, "cc-node-spawn");

export function flashEdges(flow: Flow, ids: string[]) {
  if (ids.length === 0) return;
  const targeted = new Set(ids);
  flow.setEdges((prev: Edge[]) =>
    prev.map((e) => (targeted.has(e.id) ? withClass(e, "cc-edge-flash") : e)),
  );
  globalThis.setTimeout(() => {
    flow.setEdges((prev: Edge[]) =>
      prev.map((e) => (targeted.has(e.id) ? withoutClass(e, "cc-edge-flash") : e)),
    );
  }, EDGE_FLASH_MS);
}
