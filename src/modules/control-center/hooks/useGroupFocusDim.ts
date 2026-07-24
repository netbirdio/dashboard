import { useEffect } from "react";
import {
  useCanvasState,
  useDestinationGroup,
} from "@/modules/control-center/ControlCenterContext";

// Focus highlight (live AND draft): while a group's side panel is open (or
// a peer/resource is focused), everything that is NOT on the node's path
// dims to grayscale — the node, the policies it feeds, and the
// networks/destinations those reach stay lit, so "group X → policy →
// network Y" reads at a glance. Applied via node/edge `className`
// (`cc-dimmed`, globals.css); cleared when the focus ends.
// Selector nodes (pick a peer/group/user) aren't real entities and can never
// be focused.
const SELECTOR_NODE_TYPES = new Set([
  "selectPeerNode",
  "selectGroupNode",
  "selectUserNode",
]);

export function useGroupFocusDim() {
  const { nodes, edges, setNodes, setEdges } = useCanvasState();
  const { selectedDestinationGroup, focusedNodeId, highlightArmed } =
    useDestinationGroup();

  // Either a group (panel open) or a directly focused node (peer click in
  // the user view).
  const focusGroup = selectedDestinationGroup;
  const focusNode = focusedNodeId;

  useEffect(() => {
    const MANAGED = new Set(["cc-dimmed", "cc-unfocusable", "cc-focus-root"]);
    const clear = () => {
      // draggable: true is the focus-root marker (see below) — nothing else
      // sets a per-node draggable, so clearing it can't clobber other state.
      if (nodes.some((n) => MANAGED.has(n.className ?? "") || n.draggable)) {
        setNodes((prev) =>
          prev.map((n) =>
            MANAGED.has(n.className ?? "") || n.draggable
              ? { ...n, className: undefined, draggable: undefined }
              : n,
          ),
        );
      }
      if (edges.some((e) => e.className === "cc-dimmed")) {
        setEdges((prev) =>
          prev.map((e) =>
            e.className === "cc-dimmed"
              ? { ...e, className: undefined }
              : e,
          ),
        );
      }
    };

    if (!focusGroup && !focusNode) {
      // Focus Mode armed but nothing targeted yet: mark the nodes that CAN'T
      // be focused (selectors, nodes without a single edge) so the armed
      // hover ring / pointer skips them (cc-unfocusable, globals.css).
      if (highlightArmed) {
        const connected = new Set<string>();
        edges.forEach((e) => {
          connected.add(e.source);
          connected.add(e.target);
        });
        setNodes((prev) => {
          let changed = false;
          const next = prev.map((n) => {
            const cls =
              SELECTOR_NODE_TYPES.has(n.type ?? "") || !connected.has(n.id)
                ? "cc-unfocusable"
                : undefined;
            // Built-in draggable:false (live frame rows) survives; only the
            // focus-root true marker gets cleared.
            const drag = n.draggable === false ? false : undefined;
            if (
              (n.className ?? undefined) === cls &&
              (n.draggable ?? undefined) === drag
            ) {
              return n;
            }
            changed = true;
            return { ...n, className: cls, draggable: drag };
          });
          return changed ? next : prev;
        });
        return;
      }
      clear();
      return;
    }
    const root = focusNode
      ? nodes.find((n) => n.id === focusNode)
      : nodes.find(
          (n) =>
            (n.data as { group?: { id?: string } })?.group?.id ===
              focusGroup ||
            n.id === focusGroup ||
            n.id === `group-${focusGroup}`,
        );
    if (!root) {
      clear();
      return;
    }
    // No edges = no path to trace — dimming the rest of the canvas would
    // just gray everything out for nothing.
    if (!edges.some((e) => e.source === root.id || e.target === root.id)) {
      clear();
      return;
    }

    // Forward closure (everything the group's traffic reaches) PLUS the
    // backward closure (everything feeding it) — a destination group's path
    // lies upstream (peer/group views: peer → policy → group). The two
    // closures stay separate: alternating directions would flood the whole
    // connected component.
    const keep = new Set<string>([root.id]);
    const forward = new Set<string>([root.id]);
    const backward = new Set<string>([root.id]);
    let grew = true;
    while (grew) {
      grew = false;
      edges.forEach((e) => {
        if (forward.has(e.source) && !forward.has(e.target)) {
          forward.add(e.target);
          grew = true;
        }
        if (backward.has(e.target) && !backward.has(e.source)) {
          backward.add(e.source);
          grew = true;
        }
      });
    }
    forward.forEach((id) => keep.add(id));
    backward.forEach((id) => keep.add(id));
    // Frame children ride with their kept frame.
    nodes.forEach((n) => {
      if (n.parentId && keep.has(n.parentId)) keep.add(n.id);
    });

    setNodes((prev) => {
      let changed = false;
      const next = prev.map((n) => {
        // The focused node itself wears its own persistent ring
        // (cc-focus-root, globals.css) — distinct from the context-menu /
        // panel halo. Only a REAL focus target gets it, not a group whose
        // panel is merely open.
        const cls =
          focusNode && n.id === root.id
            ? "cc-focus-root"
            : keep.has(n.id)
            ? undefined
            : "cc-dimmed";
        // Focus mode turns global nodesDraggable off, but every node ON the
        // path stays movable/clickable — per-node draggable overrides the
        // global flag. Dimmed nodes are locked (pointer-events none), and
        // nodes built with an explicit draggable:false (live frame rows)
        // keep it.
        const drag =
          n.draggable === false
            ? false
            : keep.has(n.id)
            ? true
            : undefined;
        if (
          (n.className ?? undefined) === cls &&
          (n.draggable ?? undefined) === drag
        ) {
          return n;
        }
        changed = true;
        return { ...n, className: cls, draggable: drag };
      });
      return changed ? next : prev;
    });
    setEdges((prev) => {
      let changed = false;
      const next = prev.map((e) => {
        const cls =
          keep.has(e.source) && keep.has(e.target) ? undefined : "cc-dimmed";
        if ((e.className ?? undefined) === cls) return e;
        changed = true;
        return { ...e, className: cls };
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusGroup, focusNode, highlightArmed, nodes, edges]);
}
