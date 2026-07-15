import { useEffect, useRef } from "react";
import { Connection, Edge, Node, useReactFlow } from "@xyflow/react";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import {
  loadDraftCanvas,
  saveDraftCanvas,
} from "@/modules/control-center/draft/draft-storage";
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
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import { getPlaceholderPeer } from "@/modules/control-center/utils/helpers";
import { useDraftPeerUpgrade } from "@/modules/control-center/hooks/useDraftPeerUpgrade";
import {
  addNode,
  addEdge,
  DEFAULT_LAYOUT_CONFIG,
} from "@/modules/control-center/utils/graph-builder";

export function useDraft() {
  // Upgrades installed placeholders to real peers as they register.
  useDraftPeerUpgrade();

  const { nodes, edges, setNodes, setEdges, setLayoutInitialized } =
    useCanvasState();
  const { policies, peers, networkResources, groups } =
    useControlCenterData();
  const { isDraft, setIsDraft, activeTool, setActiveTool, draftSession } =
    useDraftMode();
  const {
    setCreatePolicyModal,
    setPolicyInitialName,
    setPolicySourceResource,
    setPolicyDestinationResource,
    setPolicySourceGroups,
    setPolicyDestinationGroups,
    updateDraftPolicy,
  } = useControlCenterPolicy();
  const { changeCount } = useDraftChangeset();
  const reactFlow = useReactFlow();
  const liveStateRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const wasDraftRef = useRef(false);

  // Tools only apply in draft — live mode always pans (grab cursor), even if
  // the select tool was active when the draft was left.
  const isSelectMode = isDraft && activeTool === CanvasTool.Select;

  // Save live state when entering draft, build canvas from policies; restore
  // when leaving. Also re-runs when draftSession bumps ("New Draft") — then
  // the live snapshot must NOT be overwritten with the current draft canvas.
  useEffect(() => {
    if (isDraft) {
      if (!wasDraftRef.current) {
        liveStateRef.current = { nodes, edges };
      }
      wasDraftRef.current = true;
      // Rebuilds triggered while already drafting ("New Draft") must derive
      // from the saved live canvas, not the current draft nodes.
      const liveNodes = liveStateRef.current?.nodes ?? nodes;

      // A persisted draft (e.g. the page was reloaded mid-draft) takes
      // precedence over rebuilding from live policies — it carries the
      // pending changes' canvas state.
      const persisted = loadDraftCanvas();
      if (persisted && (persisted.nodes.length > 0 || changeCount > 0)) {
        setNodes(persisted.nodes);
        setEdges(persisted.edges);
        if (persisted.nodes.length > 0) {
          setTimeout(() => {
            reactFlow.fitView({
              nodes: persisted.nodes,
              padding: 0.1,
              duration: 500,
              maxZoom: 0.8,
              minZoom: DEFAULT_MIN_ZOOM,
            });
          }, 100);
        }
        return;
      }

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
        liveNodes
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

      // Carry over the entities shown in the live view even when they have no
      // policies (e.g. group view of a policy-less group) so the draft
      // doesn't start empty. Covers group nodes drawn on the live canvas and
      // the group/peer picked in the live select node.
      const hasGroup = (id?: string) =>
        !!id && allNodes.some((n) => (n.data as any)?.group?.id === id);
      const hasPeer = (id?: string) =>
        !!id && allNodes.some((n) => (n.data as any)?.peer?.id === id);

      liveNodes.forEach((liveNode) => {
        const data = liveNode.data as any;

        const group: Group | undefined =
          liveNode.type === "selectGroupNode"
            ? groups?.find((g) => g.id === data?.currentGroup)
            : data?.group?.id
            ? (data.group as Group)
            : undefined;
        if (group?.id && !hasGroup(group.id)) {
          const members = groupMembers.get(group.id);
          addNode(allNodes, {
            id: `group-${group.id}`,
            type: "groupNode",
            data: {
              group,
              enabled: true,
              showHandles: true,
              ...(members ? { addedMembers: members } : {}),
            },
            position: { x: 0, y: 0 },
          });
          return;
        }

        const peer =
          liveNode.type === "selectPeerNode"
            ? peers?.find((p) => p.id === data?.currentPeer)
            : undefined;
        if (peer?.id && !hasPeer(peer.id)) {
          addNode(allNodes, {
            id: `peer-${peer.id}`,
            type: "peerNode",
            data: { peer, enabled: true, showHandles: true, variant: "card" },
            position: { x: 0, y: 0 },
          });
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

      // Only fit when the draft actually has content — fitting an empty draft
      // leaves the viewport in an odd spot, throwing off later drop positions.
      if (updatedNodes.length > 0) {
        setTimeout(() => {
          reactFlow.fitView({
            nodes: updatedNodes,
            padding: 0.1,
            duration: 500,
            maxZoom: 0.8,
            minZoom: DEFAULT_MIN_ZOOM,
          });
        }, 100);
      }
    } else if (liveStateRef.current) {
      wasDraftRef.current = false;
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
  }, [isDraft, draftSession]);

  // Persist the draft canvas (debounced) so a reload doesn't lose the draft.
  // Cancel / Deploy / switch-to-live clear it via clearDraftStorage().
  useEffect(() => {
    if (!isDraft) return;
    const timer = setTimeout(() => saveDraftCanvas(nodes, edges), 400);
    return () => clearTimeout(timer);
  }, [isDraft, nodes, edges]);

  const onNodeConnect = (connection: Connection) => {
    const source = connection?.source;
    const target = connection?.target;

    type NodeInfo =
      | { kind: "peer"; id: string }
      | { kind: "group"; id: string }
      | { kind: "resource"; id: string }
      | { kind: "policy"; id: string };

    const parseNodeId = (id: string): NodeInfo | undefined => {
      if (id.startsWith("peer-")) return { kind: "peer", id: id.replace("peer-", "") };
      if (id.startsWith("dest-group-")) return { kind: "group", id };
      // Draft groups have no API id — keep the full node id for lookup.
      if (id.startsWith("group-new-")) return { kind: "group", id };
      if (id.startsWith("group-")) return { kind: "group", id: id.replace("group-", "") };
      if (id.startsWith("resource-")) return { kind: "resource", id: id.replace("resource-", "") };
      if (id.startsWith("policy-")) return { kind: "policy", id: id.replace("policy-", "") };
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

    // Find a peer from API data or a placeholder peer node (not installed
    // yet — pseudo-peer with its unique draft id).
    const findPeer = (id: string): Peer | undefined =>
      peers?.find((p) => p.id === id) ??
      getPlaceholderPeer(currentNodes.find((n) => n.id === `peer-${id}`));

    // Adds a group to one side of an existing policy — recorded as an
    // update-policy change and redrawn. No-ops for duplicates and for sides
    // occupied by a resource (groups can't be mixed with resources).
    const addGroupToPolicy = (
      policyNodeId: string,
      groupNodeId: string,
      side: "sources" | "destinations",
    ) => {
      const policyNode = currentNodes.find((n) => n.id === policyNodeId);
      const policy = (policyNode?.data as any)?.policy as Policy | undefined;
      const rule = policy?.rules?.[0];
      if (!policy || !rule) return;
      if (side === "sources" && rule.sourceResource) return;
      if (side === "destinations" && rule.destinationResource) return;

      const group = findGroup(groupNodeId);
      if (!group) return;

      const groupKey = (g: Group | string) =>
        typeof g === "string" ? g : g.id ?? g.name;
      const list = (rule[side] as (Group | string)[]) ?? [];
      if (list.some((g) => groupKey(g) === groupKey(group))) return;

      updateDraftPolicy({
        ...policy,
        rules: [
          { ...rule, [side]: [...list, group] },
          ...(policy.rules?.slice(1) ?? []),
        ],
      });
    };

    // Adds a single peer to one side of an existing policy — a side holds
    // either groups or ONE peer/resource, so this only applies to an empty
    // side. Placeholder peers connect with their draft id.
    const addPeerToPolicy = (
      policyNodeId: string,
      peerId: string,
      side: "sources" | "destinations",
    ) => {
      const policyNode = currentNodes.find((n) => n.id === policyNodeId);
      const policy = (policyNode?.data as any)?.policy as Policy | undefined;
      const rule = policy?.rules?.[0];
      if (!policy || !rule) return;
      const resourceKey =
        side === "sources" ? "sourceResource" : "destinationResource";
      if (rule[resourceKey]) return;
      if (((rule[side] as unknown[]) ?? []).length > 0) return;
      const peer = findPeer(peerId);
      if (!peer?.id) return;
      updateDraftPolicy({
        ...policy,
        rules: [
          { ...rule, [resourceKey]: { id: peer.id, type: "peer" } },
          ...(policy.rules?.slice(1) ?? []),
        ],
      });
    };

    // Policy handle → group/peer: the right handle adds the target as a
    // destination, the left one as a source.
    if (sourceInfo.kind === "policy") {
      const side = connection.sourceHandle?.startsWith("sl")
        ? ("sources" as const)
        : ("destinations" as const);
      if (targetInfo.kind === "group") addGroupToPolicy(source, targetInfo.id, side);
      else if (targetInfo.kind === "peer") addPeerToPolicy(source, targetInfo.id, side);
      return;
    }

    // Group/peer handle → policy: dragging from the node's left handle means
    // it sits to the right of the policy → destination; from its right
    // handle → source.
    if (targetInfo.kind === "policy") {
      const side = connection.sourceHandle?.startsWith("sl")
        ? ("destinations" as const)
        : ("sources" as const);
      if (sourceInfo.kind === "group") addGroupToPolicy(target, sourceInfo.id, side);
      else if (sourceInfo.kind === "peer") addPeerToPolicy(target, sourceInfo.id, side);
      return;
    }

    // Prefill for the create-policy modal. Each side holds either groups or
    // a single peer/resource (never both) — reset everything first so a
    // previously cancelled modal can't leak stale values into this connect.
    setPolicySourceResource(undefined);
    setPolicyDestinationResource(undefined);

    // Set source resource or group
    let sourceName: string | undefined;
    let destName: string | undefined;
    const sourceGroups: Group[] = [];
    if (sourceInfo.kind === "peer") {
      const peer = findPeer(sourceInfo.id);
      if (peer?.id) {
        setPolicySourceResource({ id: peer.id, type: "peer" });
        sourceName = peer.name;
      }
    } else if (sourceInfo.kind === "group") {
      const group = findGroup(sourceInfo.id);
      if (group) {
        sourceGroups.push(group);
        sourceName = group.name;
      }
    } else if (sourceInfo.kind === "resource") {
      const resource = networkResources?.find((r) => r.id === sourceInfo.id);
      if (resource?.id) {
        setPolicySourceResource({ id: resource.id, type: "host" });
        sourceName = resource.name;
      }
    }

    // Set destination resource or group
    const destGroups: Group[] = [];
    if (targetInfo.kind === "peer") {
      const peer = findPeer(targetInfo.id);
      if (peer?.id) {
        setPolicyDestinationResource({ id: peer.id, type: "peer" });
        destName = peer.name;
      }
    } else if (targetInfo.kind === "group") {
      const group = findGroup(targetInfo.id);
      if (group) {
        destGroups.push(group);
        destName = group.name;
      }
    } else if (targetInfo.kind === "resource") {
      const resource = networkResources?.find((r) => r.id === targetInfo.id);
      if (resource?.id) {
        setPolicyDestinationResource({ id: resource.id, type: "host" });
        destName = resource.name;
      }
    }

    setPolicySourceGroups(sourceGroups);
    setPolicyDestinationGroups(destGroups);

    // Default policy name, e.g. "All to New Group".
    setPolicyInitialName(
      sourceName && destName ? `${sourceName} to ${destName}` : "",
    );

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
