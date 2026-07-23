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
export function useGroupFocusDim() {
  const { nodes, edges, setNodes, setEdges } = useCanvasState();
  const { selectedDestinationGroup, focusedNodeId } = useDestinationGroup();

  // Either a group (panel open) or a directly focused node (peer click in
  // the user view).
  const focusGroup = selectedDestinationGroup;
  const focusNode = focusedNodeId;

  useEffect(() => {
    const clear = () => {
      if (nodes.some((n) => n.className === "cc-dimmed")) {
        setNodes((prev) =>
          prev.map((n) =>
            n.className === "cc-dimmed"
              ? { ...n, className: undefined }
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
        const cls = keep.has(n.id) ? undefined : "cc-dimmed";
        if ((n.className ?? undefined) === cls) return n;
        changed = true;
        return { ...n, className: cls };
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
  }, [focusGroup, focusNode, nodes, edges]);
}
