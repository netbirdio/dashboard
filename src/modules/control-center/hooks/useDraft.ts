import { useEffect, useRef } from "react";
import { Connection, Edge, Node, useReactFlow } from "@xyflow/react";
import {
  applyD3HierarchicalLayout,
  DEFAULT_MIN_ZOOM,
} from "@/modules/control-center/utils/layouts";
import { NodeType } from "@/modules/control-center/utils/nodes";
import {
  CanvasTool,
  useDraftMode,
} from "@/modules/control-center/draft/DraftModeContext";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useControlCenterPolicy } from "@/modules/control-center/ControlCenterPolicyModals";
import { Group } from "@/interfaces/Group";
import { NetworkResource } from "@/interfaces/Network";
import {
  addNode,
  addEdge,
  DEFAULT_LAYOUT_CONFIG,
} from "@/modules/control-center/utils/graph-builder";

export function useDraft() {
  const { nodes, edges, setNodes, setEdges, setLayoutInitialized } =
    useCanvasState();
  const { policies, peers, networkResources, groups } =
    useControlCenterData();
  const { isDraft, setIsDraft, activeTool, setActiveTool } = useDraftMode();
  const {
    setCreatePolicyModal,
    setPolicySourceResource,
    setPolicyDestinationResource,
    setPolicySourceGroups,
    setPolicyDestinationGroups,
  } = useControlCenterPolicy();
  const reactFlow = useReactFlow();
  const liveStateRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);

  const isSelectMode = activeTool === CanvasTool.Select;

  // Save live state when entering draft, build canvas from policies; restore when leaving
  useEffect(() => {
    if (isDraft) {
      liveStateRef.current = { nodes, edges };

      // Build a lookup of group members from API data
      const groupMembers = new Map<string, Set<string>>();
      peers?.forEach((p) => {
        p.groups?.forEach((g) => {
          const gid = typeof g === "string" ? g : g.id;
          if (!gid) return;
          if (!groupMembers.has(gid)) groupMembers.set(gid, new Set());
          if (p.id) groupMembers.get(gid)!.add(p.id);
        });
      });
      networkResources?.forEach((r) => {
        (r.groups as any[])?.forEach((g: any) => {
          const gid = typeof g === "string" ? g : g?.id;
          if (!gid) return;
          if (!groupMembers.has(gid)) groupMembers.set(gid, new Set());
          groupMembers.get(gid)!.add(r.id);
        });
      });

      // Build the draft canvas from policies visible in the live view
      const allNodes: Node[] = [];
      const allEdges: Edge[] = [];

      const livePolicyIds = new Set(
        nodes
          .filter((n) => n.type === "policyNode")
          .map((n) => (n.data as any)?.policy?.id)
          .filter(Boolean),
      );

      const visiblePolicies = policies?.filter(
        (p) => p.id && livePolicyIds.has(p.id),
      );

      visiblePolicies?.forEach((policy) => {
        const rule = policy.rules?.[0];
        if (!rule) return;

        const enabled = policy.enabled;
        const policyNodeId = `policy-${policy.id}`;

        // Add policy node
        addNode(allNodes, {
          id: policyNodeId,
          type: "policyNode",
          data: { policy },
          position: { x: 0, y: 0 },
        });

        // Detect self-referencing groups (same group in both sources and destinations)
        const sources = (rule.sources as Group[]) ?? [];
        const destinations = (rule.destinations as Group[]) ?? [];
        const sourceGroupIds = new Set(
          sources
            .map((s) => (typeof s === "string" ? s : s.id))
            .filter(Boolean),
        );
        const destGroupIds = new Set(
          destinations
            .map((d) => (typeof d === "string" ? d : d.id))
            .filter(Boolean),
        );
        const selfRefGroupIds = new Set(
          [...sourceGroupIds].filter((id) => destGroupIds.has(id)),
        );

        // Source groups
        sources.forEach((source) => {
          const groupId = typeof source === "string" ? source : source.id;
          if (!groupId) return;
          const group =
            typeof source === "string"
              ? groups?.find((g) => g.id === source)
              : source;
          if (!group) return;

          const nodeId = `group-${groupId}`;
          const members = groupMembers.get(groupId);
          addNode(allNodes, {
            id: nodeId,
            type: "groupNode",
            data: {
              group,
              enabled,
              showHandles: true,
              ...(members ? { addedMembers: members } : {}),
            },
            position: { x: 0, y: 0 },
          });

          addEdge(allEdges, {
            id: `${nodeId}-${policyNodeId}`,
            source: nodeId,
            target: policyNodeId,
            type: "smart",
            data: { enabled, policy },
          });
        });

        // Source resource (peer)
        const sourceResource = rule.sourceResource;
        if (sourceResource?.id && sourceResource.type === "peer") {
          const peer = peers?.find((p) => p.id === sourceResource.id);
          if (peer) {
            const nodeId = `peer-${peer.id}`;
            addNode(allNodes, {
              id: nodeId,
              type: "peerNode",
              data: {
                peer,
                enabled: true,
                showHandles: true,
                variant: "card",
              },
              position: { x: 0, y: 0 },
            });

            addEdge(allEdges, {
              id: `${nodeId}-${policyNodeId}`,
              source: nodeId,
              target: policyNodeId,
              type: "smart",
              data: { enabled, policy },
            });
          }
        }

        // Destination groups
        destinations.forEach((dest) => {
          const groupId = typeof dest === "string" ? dest : dest.id;
          if (!groupId) return;
          const group =
            typeof dest === "string"
              ? groups?.find((g) => g.id === dest)
              : dest;
          if (!group) return;

          const isSelfRef = selfRefGroupIds.has(groupId);
          const members = groupMembers.get(groupId);

          // For self-referencing groups, reuse any existing destination node,
          // otherwise create a separate destination copy
          let nodeId = `group-${groupId}`;
          const existingDest = allNodes.find(
            (n) =>
              n.type === "destinationGroupNode" &&
              (n.id === `group-${groupId}` ||
                n.id.startsWith(`dest-group-${groupId}-`)),
          );

          if (existingDest) {
            nodeId = existingDest.id;
          } else if (isSelfRef) {
            nodeId = `dest-group-${groupId}-${policy.id}`;
          }

          addNode(allNodes, {
            id: nodeId,
            type: "destinationGroupNode",
            data: {
              group,
              enabled,
              showHandles: true,
              ...(members ? { addedMembers: members } : {}),
            },
            position: { x: 0, y: 0 },
          });

          addEdge(allEdges, {
            id: `${policyNodeId}-${nodeId}`,
            source: policyNodeId,
            target: nodeId,
            type: "smart",
            data: { enabled, policy },
          });
        });

        // Destination resource (peer or network resource)
        const destResource = rule.destinationResource;
        if (destResource?.id) {
          if (destResource.type === "peer") {
            const peer = peers?.find((p) => p.id === destResource.id);
            if (peer) {
              const nodeId = `peer-${peer.id}`;
              addNode(allNodes, {
                id: nodeId,
                type: "peerNode",
                data: {
                  peer,
                  enabled: true,
                  showHandles: true,
                  variant: "card",
                },
                position: { x: 0, y: 0 },
              });

              addEdge(allEdges, {
                id: `${policyNodeId}-${nodeId}`,
                source: policyNodeId,
                target: nodeId,
                type: "smart",
                data: { enabled, policy },
              });
            }
          } else {
            const resource = networkResources?.find(
              (r) => r.id === destResource.id,
            );
            if (resource) {
              const nodeId = `resource-${resource.id}`;
              addNode(allNodes, {
                id: nodeId,
                type: "resourceNode",
                data: { resource, enabled },
                position: { x: 0, y: 0 },
              });

              addEdge(allEdges, {
                id: `${policyNodeId}-${nodeId}`,
                source: policyNodeId,
                target: nodeId,
                type: "smart",
                data: { enabled, policy },
              });
            }
          }
        }
      });

      // Apply hierarchical layout: sources → policies → destinations
      const { updatedNodes, updatedEdges } = applyD3HierarchicalLayout(
        allNodes,
        allEdges,
        400,
        120,
        "peer",
        DEFAULT_LAYOUT_CONFIG,
      );

      setNodes(updatedNodes);
      setEdges(updatedEdges);

      setTimeout(() => {
        reactFlow.fitView({
          nodes: updatedNodes,
          padding: 0.1,
          duration: 500,
          maxZoom: 0.8,
          minZoom: DEFAULT_MIN_ZOOM,
        });
      }, 100);
    } else if (liveStateRef.current) {
      const restored = liveStateRef.current;
      setNodes(restored.nodes);
      setEdges(restored.edges);
      liveStateRef.current = null;
      // Fit view after restoring live state
      setTimeout(() => {
        reactFlow.fitView({
          nodes: restored.nodes,
          padding: 0.1,
          duration: 500,
          maxZoom: 0.8,
          minZoom: DEFAULT_MIN_ZOOM,
        });
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraft]);

  const onNodeConnect = (connection: Connection) => {
    const source = connection?.source;
    const target = connection?.target;

    type NodeInfo =
      | { kind: "peer"; id: string }
      | { kind: "group"; id: string }
      | { kind: "resource"; id: string };

    const parseNodeId = (id: string): NodeInfo | undefined => {
      if (id.startsWith("peer-")) return { kind: "peer", id: id.replace("peer-", "") };
      if (id.startsWith("dest-group-")) return { kind: "group", id };
      if (id.startsWith("group-")) return { kind: "group", id: id.replace("group-", "") };
      if (id.startsWith("resource-")) return { kind: "resource", id: id.replace("resource-", "") };
      // Handle expanded/destination variants
      if (id.startsWith("expanded-peer-")) return { kind: "peer", id: id.replace("expanded-peer-", "") };
      if (id.startsWith("source-peer-")) return { kind: "peer", id: id.replace("source-peer-", "") };
      if (id.startsWith("destination-resource-")) return { kind: "resource", id: id.replace("destination-resource-", "") };
      return undefined;
    };

    const sourceInfo = parseNodeId(source);
    const targetInfo = parseNodeId(target);
    if (!sourceInfo || !targetInfo) return;

    const currentNodes = reactFlow.getNodes();

    // Find group from API data or from canvas node data (for draft groups)
    const findGroup = (id: string): Group | undefined => {
      const apiGroup = groups?.find((g) => g.id === id);
      if (apiGroup) return apiGroup;
      // Look up by group.id in node data, or by full node ID (for dest-group- nodes)
      const canvasNode =
        currentNodes.find((n) => (n.data as any)?.group?.id === id) ??
        currentNodes.find((n) => n.id === id);
      return (canvasNode?.data as any)?.group as Group | undefined;
    };

    // Set source resource or group
    const sourceGroups: Group[] = [];
    if (sourceInfo.kind === "peer") {
      const peer = peers?.find((p) => p.id === sourceInfo.id);
      if (peer?.id) setPolicySourceResource({ id: peer.id, type: "peer" });
    } else if (sourceInfo.kind === "group") {
      const group = findGroup(sourceInfo.id);
      if (group) sourceGroups.push(group);
    } else if (sourceInfo.kind === "resource") {
      const resource = networkResources?.find((r) => r.id === sourceInfo.id);
      if (resource?.id) setPolicySourceResource({ id: resource.id, type: "host" });
    }

    // Set destination resource or group
    const destGroups: Group[] = [];
    if (targetInfo.kind === "peer") {
      const peer = peers?.find((p) => p.id === targetInfo.id);
      if (peer?.id) setPolicyDestinationResource({ id: peer.id, type: "peer" });
    } else if (targetInfo.kind === "group") {
      const group = findGroup(targetInfo.id);
      if (group) destGroups.push(group);
    } else if (targetInfo.kind === "resource") {
      const resource = networkResources?.find((r) => r.id === targetInfo.id);
      if (resource?.id) setPolicyDestinationResource({ id: resource.id, type: "host" });
    }

    if (sourceGroups.length > 0) setPolicySourceGroups(sourceGroups);
    if (destGroups.length > 0) setPolicyDestinationGroups(destGroups);

    setCreatePolicyModal(true);
  };

  return {
    isDraft,
    setIsDraft,
    activeTool,
    setActiveTool,
    isSelectMode,
    onNodeConnect,
  };
}
