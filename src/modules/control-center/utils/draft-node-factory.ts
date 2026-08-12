import { Node } from "@xyflow/react";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Policy } from "@/interfaces/Policy";
import {
  getLiveFrameGrid,
  NETWORK_FRAME_FALLBACK_ROW,
  orderFrameResources,
} from "@/modules/control-center/utils/helpers";

// Pure node builders for RESTORING a live entity onto the draft canvas when a
// delete/update change is removed. They mirror the shapes the initial draft
// build produces (useDraft.ts carryNetworkFrame / group + resource passes) so a
// restored node is indistinguishable from one carried in on draft entry.

/** An existing group node, in the shape useDraft draws source groups. */
export function buildGroupNode(group: Group, enabled = true): Node {
  return {
    id: `group-${group.id}`,
    type: "groupNode",
    data: { group, enabled, showHandles: true },
    position: { x: 0, y: 0 },
  };
}

/** A standalone (no-frame) existing resource node. */
export function buildStandaloneResourceNode(
  resource: NetworkResource,
  network: Network,
): Node {
  return {
    id: `resource-${resource.id}`,
    type: "resourceNode",
    data: {
      resource,
      enabled: resource.enabled ?? true,
      showHandles: true,
      draftNetwork: { networkId: network.id, name: network.name },
    },
    position: { x: 0, y: 0 },
  };
}

/**
 * Rebuild an existing network as a frame plus its resource children — the
 * restore counterpart of carryNetworkFrame (useDraft.ts:457-513). Returns the
 * frame node followed by its children (parent-before-child, as React Flow
 * requires). Positions/sizes come from the same capped grid the live overview
 * uses so the reconciler settles without a reshuffle.
 */
export function buildNetworkFrame(
  network: Network,
  networkResources: NetworkResource[] | undefined,
  policies: Policy[] | undefined,
): { frame: Node; children: Node[] } {
  const frameId = `network-${network.id}`;
  const childResources = orderFrameResources(
    (networkResources ?? []).filter((r) =>
      network.resources?.includes(r.id ?? ""),
    ),
    network.policies,
    policies,
  );
  const grid = getLiveFrameGrid(childResources.length);
  const frame: Node = {
    id: frameId,
    type: "networkNode",
    position: { x: 0, y: 0 },
    style: { width: grid.width, height: grid.height },
    data: { network, frame: true },
  };
  const childRef = { networkId: network.id, name: network.name };
  const children: Node[] = childResources.map((r, i) => ({
    id: `resource-${r.id}`,
    type: "resourceNode",
    parentId: frameId,
    position: grid.cellPosition(i),
    hidden: i >= grid.visibleCount,
    selectable: false,
    style: { width: grid.childWidth, height: NETWORK_FRAME_FALLBACK_ROW },
    data: {
      resource: r,
      enabled: true,
      showHandles: true,
      draftNetwork: childRef,
    },
  }));
  return { frame, children };
}
