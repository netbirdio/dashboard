import { Node } from "@xyflow/react";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Policy } from "@/interfaces/Policy";
import {
  getLiveFrameGrid,
  NETWORK_FRAME_FALLBACK_ROW,
  orderFrameResources,
} from "@/modules/control-center/utils/helpers";

// Pure node builders that restore a live entity onto the draft canvas when its
// change is removed, mirroring the shapes the draft build (useDraft.ts) makes.

export function buildGroupNode(group: Group): Node {
  return {
    id: `group-${group.id}`,
    type: "groupNode",
    data: { group, enabled: true, showHandles: true },
    position: { x: 0, y: 0 },
  };
}

export function buildStandaloneResourceNode(
  resource: NetworkResource,
  network: Network,
): Node {
  return {
    id: `resource-${resource.id}`,
    type: "resourceNode",
    data: {
      // `enabled` is the owning frame's dim flag; the resource's OWN state flows via
      // getResourceNodeEnabled — duplicated here it would survive a draft toggle.
      enabled: true,
      resource,
      showHandles: true,
      draftNetwork: { networkId: network.id, name: network.name },
    },
    position: { x: 0, y: 0 },
  };
}

// Children follow the frame: React Flow requires parent before child.
export function buildNetworkFrame(
  network: Network,
  networkResources: NetworkResource[] | undefined,
  policies: Policy[] | undefined,
): { frame: Node; children: Node[] } {
  const frameId = `network-${network.id}`;
  // Map network.resources (NOT the global list): orderFrameResources is a stable
  // partition, so a different input order reshuffles the untargeted rows.
  const childResources = orderFrameResources(
    (network.resources ?? [])
      .map((rid) => (networkResources ?? []).find((r) => r.id === rid))
      .filter(Boolean) as NetworkResource[],
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
