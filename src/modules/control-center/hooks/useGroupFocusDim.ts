import { useEffect } from "react";
import {
  useCanvasState,
  useDestinationGroup,
} from "@/modules/control-center/contexts/ControlCenterContext";
import { isFocusWorthy } from "@/modules/control-center/utils/helpers";

// Focus highlight (live and draft): while a node is explicitly focused,
// everything off its edge path dims to grayscale (`cc-dimmed`, globals.css).
// Selector nodes aren't real entities and can never be focused.
const SELECTOR_NODE_TYPES = new Set([
  "selectPeerNode",
  "selectGroupNode",
  "selectUserNode",
]);

export function useGroupFocusDim() {
  const { nodes, edges, setNodes, setEdges } = useCanvasState();
  const { focusedNodeId, highlightArmed } = useDestinationGroup();

  useEffect(() => {
    const MANAGED = new Set(["cc-dimmed", "cc-unfocusable"]);
    const clear = () => {
      // draggable:true is the focus marker; nothing else sets a per-node
      // draggable, so clearing it can't clobber other state.
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

    if (!focusedNodeId) {
      // Armed but untargeted: mark what can't be focused so the armed hover
      // ring and pointer skip those nodes.
      if (highlightArmed) {
        setNodes((prev) => {
          let changed = false;
          const next = prev.map((n) => {
            const cls =
              SELECTOR_NODE_TYPES.has(n.type ?? "") ||
              !isFocusWorthy(n.id, prev, edges)
                ? "cc-unfocusable"
                : undefined;
            // Built-in draggable:false (live frame rows) survives.
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
    const root = nodes.find((n) => n.id === focusedNodeId);
    if (!root) {
      clear();
      return;
    }
    // No edges means no path to trace; dimming would gray out everything.
    if (!edges.some((e) => e.source === root.id || e.target === root.id)) {
      clear();
      return;
    }

    // A destination group's path lies upstream, so both closures are needed.
    // They stay separate: alternating directions would flood the component.
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
    nodes.forEach((n) => {
      if (n.parentId && keep.has(n.parentId)) keep.add(n.id);
    });

    setNodes((prev) => {
      let changed = false;
      const next = prev.map((n) => {
        const cls = keep.has(n.id) ? undefined : "cc-dimmed";
        // Focus mode turns global nodesDraggable off, so nodes on the path need
        // a per-node draggable to stay movable; dimmed ones stay locked.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setNodes/setEdges are stable dispatchers, not dim triggers
  }, [focusedNodeId, highlightArmed, nodes, edges]);
}
