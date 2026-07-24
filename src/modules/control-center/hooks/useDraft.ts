import { useEffect, useRef } from "react";
import { orderBy, sortBy } from "lodash";
import { FlowView } from "@/modules/control-center/FlowSelector";
import { Connection, Edge, Node, useReactFlow } from "@xyflow/react";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import {
  loadDraftCanvas,
  saveDraftCanvas,
} from "@/modules/control-center/draft/draft-storage";
import { DEFAULT_MIN_ZOOM } from "@/modules/control-center/utils/layouts";
import { applyDraftBuildLayout } from "@/modules/control-center/utils/draft-build-layout";
import { NodeType } from "@/modules/control-center/utils/nodes";
import {
  CanvasTool,
  useDraftMode,
} from "@/modules/control-center/draft/DraftModeContext";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useControlCenterPolicy } from "@/modules/control-center/ControlCenterPolicyModals";
import { Group } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import {
  ensureParentsBeforeChildren,
  getFrameChildPosition,
  getLiveFrameGrid,
  isFrameNode,
  NETWORK_FRAME_ADD_ROW,
  NETWORK_FRAME_CHILD_WIDTH,
  NETWORK_FRAME_FALLBACK_ROW,
  NETWORK_FRAME_PADDING_Y,
  NETWORK_FRAME_WIDTH,
  orderFrameResources,
} from "@/modules/control-center/utils/helpers";
import { handleDraftConnect } from "@/modules/control-center/utils/draft-connect";
import { computeDrillDownKeepSet } from "@/modules/control-center/utils/frame-view";
import { useDraftNetworkActions } from "@/modules/control-center/hooks/useDraftNetworkActions";
import { useDraftPeerUpgrade } from "@/modules/control-center/hooks/useDraftPeerUpgrade";
import { useNetworkFrameLayout } from "@/modules/control-center/hooks/useNetworkFrameLayout";
import { useFrameEdgeAttachment } from "@/modules/control-center/hooks/useFrameEdgeAttachment";
import { useNetworkDrillDown } from "@/modules/control-center/hooks/useNetworkDrillDown";
import {
  addNode,
  addEdge,
} from "@/modules/control-center/utils/graph-builder";

export function useDraft() {
  // Upgrades installed placeholders to real peers as they register.
  useDraftPeerUpgrade();
  // Network frames size themselves from their children's measured heights.
  useNetworkFrameLayout();
  // Policy edges to framed resources attach to the frame (parent view) or
  // the resource (drill-down).
  useFrameEdgeAttachment();
  // Clicking a frame enters the single-network drill-down view.
  useNetworkDrillDown();

  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    setLayoutInitialized,
    selectedNetwork,
    setSelectedNetwork,
    currentView,
  } = useCanvasState();
  const { policies, peers, networks, networkResources, groups } =
    useControlCenterData();
  const {
    isDraft,
    setIsDraft,
    activeTool,
    setActiveTool,
    draftSession,
    setNetworkDestinationPicker,
    drillDownNetworkNodeId,
    setDrillDownNetworkNodeId,
  } = useDraftMode();
  const {
    setCreatePolicyModal,
    setPolicyInitialName,
    setPolicySourceResource,
    setPolicyDestinationResource,
    setPolicySourceGroups,
    setPolicyDestinationGroups,
    setPolicyDestinationScope,
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
        // Snapshots saved before the parents-before-children reconcile can
        // carry a child ahead of its frame — heal the order on restore.
        setNodes(ensureParentsBeforeChildren(persisted.nodes));
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

      // Draft nodes whose id differs from their live counterpart (self-ref
      // destination clones, destination resources/peers) REMOUNT on the mode
      // switch, and React Flow hides unmeasured new nodes for one frame — a
      // visible blink in the destination column. Adopting the live node's
      // measured size lets them paint immediately in the same slot.
      const liveDims = (liveId: string) => {
        const m = liveNodes.find((n) => n.id === liveId)?.measured;
        return m?.width && m?.height
          ? { initialWidth: m.width, initialHeight: m.height }
          : {};
      };

      const livePolicyIds = new Set(
        liveNodes
          .filter((n) => n.type === "policyNode")
          .map((n) => (n.data as any)?.policy?.id)
          .filter(Boolean),
      );
      // The all-networks live view draws no policy nodes (dashed group/peer →
      // network lines instead) — the frames' policies still belong in the
      // draft, connections included.
      liveNodes.forEach((n) => {
        if (n.type !== "networkNode") return;
        ((n.data as any)?.network?.policies ?? []).forEach((pid: string) =>
          livePolicyIds.add(pid),
        );
      });

      // Same order as the live views' build (sortBy(policies, "enabled",
      // "desc")) — the policy column and, through per-policy node creation,
      // the destination column then keep the live vertical order.
      const visiblePolicies = sortBy(
        policies?.filter((p) => p.id && livePolicyIds.has(p.id)) ?? [],
        "enabled",
        "desc",
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

        // Destination groups — the live GROUP view sorts each policy's
        // destinations by name (peer/user views keep the API order); match
        // the view the draft was entered from so the column order carries
        // over.
        const orderedDestinations =
          currentView === FlowView.GROUPS
            ? orderBy(destinations, "name", "asc")
            : destinations;
        orderedDestinations.forEach((dest) => {
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
            // A self-ref clone replaces the live node `group-<gid>` in the
            // destination slot — adopt its size (see liveDims).
            ...(nodeId !== `group-${groupId}`
              ? liveDims(`group-${groupId}`)
              : {}),
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
                // Replaces the live `destination-resource-<id>` node in the
                // destination slot — adopt its size (see liveDims).
                ...liveDims(`destination-resource-${peer.id}`),
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
              // Stamp the resource's real network (StandaloneResourceNode
              // shows a "No Network" control without it — wrong for an
              // existing resource, which always belongs to one). Frame
              // carry-over below overwrites this with the frame's ref.
              const net = networks?.find((n) =>
                n.resources?.includes(resource.id ?? ""),
              );
              addNode(allNodes, {
                id: nodeId,
                type: "resourceNode",
                // Replaces the live `destination-resource-<id>` node in the
                // destination slot — adopt its size (see liveDims).
                ...liveDims(`destination-resource-${resource.id}`),
                data: {
                  resource,
                  enabled,
                  showHandles: true,
                  ...(net?.id
                    ? { draftNetwork: { networkId: net.id, name: net.name } }
                    : {}),
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
      // A peer already represented through one of its groups on the canvas
      // (e.g. peer view: the picked peer is a member of a visible policy's
      // source group) must not get its own node — it lives inside the group,
      // and a standalone copy would overlap it with no connections.
      const isPeerInCanvasGroup = (peerId: string) =>
        allNodes.some((n) => {
          const gid = (n.data as any)?.group?.id;
          return !!gid && !!groupMembers.get(gid)?.has(peerId);
        });

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
        if (peer?.id && !hasPeer(peer.id) && !isPeerInCanvasGroup(peer.id)) {
          addNode(allNodes, {
            id: `peer-${peer.id}`,
            type: "peerNode",
            data: { peer, enabled: true, showHandles: true, variant: "card" },
            position: { x: 0, y: 0 },
          });
        }
      });

      // Live network frames carry into the draft as EXISTING-network frames
      // (same shape as dropExistingNetworkFrame): the frame keeps its real
      // id, its resources become read-only children. Resources already drawn
      // by the policy pass are reparented into the frame.
      const carryNetworkFrame = (network: Network) => {
        if (!network.id) return;
        const frameId = `network-${network.id}`;
        if (allNodes.some((n) => n.id === frameId)) return;

        // Same policy-targeted-first order as the live overview
        // (orderFrameResources) — entering draft must not reshuffle rows.
        const childResources = orderFrameResources(
          (networkResources ?? []).filter((r) =>
            network.resources?.includes(r.id ?? ""),
          ),
          network.policies,
          policies,
        );
        // Seed with the CAPPED parent-view grid (same as the live overview):
        // an uncapped height (all resources) made big frames seed thousands
        // of px tall — the frame grid below then spread them apart, and the
        // reconciler's later shrink left huge gaps. Draft frames swap the
        // bottom padding for the Add Resource band.
        const grid = getLiveFrameGrid(childResources.length);
        allNodes.push({
          id: frameId,
          type: "networkNode",
          position: { x: 0, y: 0 },
          style: { width: grid.width, height: grid.height },
          data: { network, frame: true },
        });
        const childRef = { networkId: network.id, name: network.name };
        childResources.forEach((r, i) => {
          // Reparent an already-drawn resource node (splice + re-push so the
          // child follows its parent in the array), or create a fresh child.
          const idx = allNodes.findIndex((n) => n.id === `resource-${r.id}`);
          const existing = idx >= 0 ? allNodes.splice(idx, 1)[0] : undefined;
          allNodes.push({
            ...(existing ?? {
              id: `resource-${r.id}`,
              type: "resourceNode",
            }),
            parentId: frameId,
            position: grid.cellPosition(i),
            hidden: i >= grid.visibleCount,
            selectable: false,
            style: {
              ...existing?.style,
              width: grid.childWidth,
              height: NETWORK_FRAME_FALLBACK_ROW,
            },
            data: {
              ...existing?.data,
              resource: r,
              enabled: true,
              showHandles: true,
              draftNetwork: childRef,
            },
          } as Node);
        });
      };
      liveNodes.forEach((liveNode) => {
        if (liveNode.type !== "networkNode") return;
        const network = (liveNode.data as { network?: Network })?.network;
        if (network?.id) carryNetworkFrame(network);
      });
      // Entering draft from the live single-network (drilled) view: that
      // view has no network node on the canvas — carry the selected network
      // as a frame and enter the draft drill-down directly (below).
      const drilledNetwork = selectedNetwork
        ? networks?.find((n) => n.id === selectedNetwork)
        : undefined;
      if (drilledNetwork) carryNetworkFrame(drilledNetwork);

      // Destination groups that are pure RESOURCE groups of ONE carried
      // network live INSIDE that network's frame as resource-group rows —
      // the policy edge re-attaches to the frame (useFrameEdgeAttachment,
      // same as framed resources), so "policy → resource group" reads as
      // "policy → network" instead of a detached group bubble.
      const frameByNetworkId = new Map<string, string>();
      allNodes.forEach((n) => {
        if (!isFrameNode(n)) return;
        const netId = (n.data as { network?: Network })?.network?.id;
        if (netId) frameByNetworkId.set(netId, n.id);
      });
      const resourceNetwork = new Map<string, string>();
      networks?.forEach((net) => {
        if (!net.id) return;
        net.resources?.forEach((rid) => resourceNetwork.set(rid, net.id!));
      });
      allNodes.forEach((node, idx) => {
        if (node.type !== "destinationGroupNode" || node.parentId) return;
        const gid = (node.data as { group?: Group })?.group?.id;
        if (!gid) return;
        const members = [...(groupMembers.get(gid) ?? [])];
        if (members.length === 0) return;
        // Same eligibility as dropping a group onto a frame by hand
        // (canDropGroupIntoNetwork): at least ONE member resource belongs
        // to exactly one carried network — peer members don't block the
        // fold (a destination group that grants access to a network's
        // resource must never float detached next to the network).
        const memberNetworks = new Set(
          members
            .map((m) => resourceNetwork.get(m))
            .filter(Boolean) as string[],
        );
        if (memberNetworks.size !== 1) return;
        const frameId = frameByNetworkId.get([...memberNetworks][0]);
        if (!frameId) return;
        // Convert in place (id kept — the smart edges follow to the frame);
        // ordering is safe: frame children are re-appended after the layout.
        allNodes[idx] = {
          ...node,
          type: NodeType.ResourceGroupNode,
          parentId: frameId,
          position: getFrameChildPosition(-1),
          style: { ...node.style, width: NETWORK_FRAME_CHILD_WIDTH },
        };
      });

      // Re-seed the frame sizes with their FOLDED group rows included —
      // the grid packing below must use final heights (live packs with the
      // group rows too; packing on pre-fold heights gave draft a tighter
      // vertical rhythm than live).
      allNodes.forEach((n) => {
        if (!isFrameNode(n)) return;
        const childCount = allNodes.filter(
          (c) => c.parentId === n.id,
        ).length;
        const g = getLiveFrameGrid(childCount);
        n.style = { ...n.style, width: g.width, height: g.height };
      });

      // Networks-entered drafts mirror the networks view: PEER-ONLY
      // destination groups (no member resources — e.g. a 6-peer group) are
      // never drawn there in live, so the draft skips them and their edges
      // too. Only applies when the draft carries network frames (i.e. it
      // was entered from the networks view).
      if (allNodes.some((n) => isFrameNode(n))) {
        const removedIds = new Set<string>();
        allNodes.forEach((node) => {
          if (node.type !== "destinationGroupNode" || node.parentId) return;
          const gid = (node.data as { group?: Group })?.group?.id;
          if (!gid) return;
          const members = [...(groupMembers.get(gid) ?? [])];
          const hasResource = members.some((m) => resourceNetwork.has(m));
          if (!hasResource) removedIds.add(node.id);
        });
        for (let i = allNodes.length - 1; i >= 0; i--) {
          if (removedIds.has(allNodes[i].id)) allNodes.splice(i, 1);
        }
        for (let i = allEdges.length - 1; i >= 0; i--) {
          if (
            removedIds.has(allEdges[i].source) ||
            removedIds.has(allEdges[i].target)
          ) {
            allEdges.splice(i, 1);
          }
        }
      }

      // Apply THE shared draft parent-view layout (also used by the
      // toolbar's Auto Arrange, so arranging an untouched draft reproduces
      // this exact layout): sources → policies → destinations, mirroring
      // whatever LIVE view the draft was entered from.
      const { updatedNodes, updatedEdges } = applyDraftBuildLayout(
        allNodes,
        allEdges,
        liveNodes,
      );
      // React Flow hides unmeasured nodes for one frame — with all-new node
      // objects that blanks the whole canvas on the mode switch. Most draft
      // nodes have a live twin with the same id (or an alias handled by
      // liveDims above); adopt its measured size so the swap paints
      // immediately.
      updatedNodes.forEach((n) => {
        if (n.initialWidth) return;
        const m = liveNodes.find((l) => l.id === n.id)?.measured;
        if (m?.width && m?.height) {
          n.initialWidth = m.width;
          n.initialHeight = m.height;
        }
      });

      // From the live drilled view, enter the draft drill-down of the same
      // network in the SAME commit: the hidden flags are pre-applied so the
      // parent view (frame box & co.) never paints, and the drill effect —
      // which reads the committed state — takes over from there (fitView
      // included).
      if (drilledNetwork) {
        const frameId = `network-${drilledNetwork.id}`;
        // Positions don't matter here — the drill-down (entered in the same
        // commit below) applies THE shared drilled layout, identical to the
        // live single-network view's.
        const keep = computeDrillDownKeepSet(
          updatedNodes,
          updatedEdges,
          frameId,
        );
        updatedNodes.forEach((n) => {
          n.hidden = !keep.has(n.id);
        });
        setDrillDownNetworkNodeId(frameId);
        setNodes(updatedNodes);
        setEdges(updatedEdges);
        return;
      }

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
      liveStateRef.current = null;

      // Leaving draft while drilled into an EXISTING network → land in the
      // live single-network view of that network (not whatever live view the
      // draft was entered from). Draft-only networks have no live view.
      const drilledFrame = drillDownNetworkNodeId
        ? nodes.find((n) => n.id === drillDownNetworkNodeId)
        : undefined;
      const drilledNetworkId = (
        drilledFrame?.data as { network?: { id?: string } }
      )?.network?.id;
      if (drilledNetworkId) {
        setLayoutInitialized(false);
        setSelectedNetwork(drilledNetworkId);
        return;
      }
      // Entered draft from the live drilled view but backed out of the
      // drill inside the draft → mirror that too: land on the all-networks
      // overview, not the stale drilled snapshot.
      if (selectedNetwork) {
        setLayoutInitialized(false);
        setSelectedNetwork("");
        return;
      }

      setNodes(restored.nodes);
      setEdges(restored.edges);
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
  // NEVER while a node is dragging: the stringify + synchronous
  // localStorage write scale with the canvas and visibly froze the drag
  // (and every edge animation) whenever the debounce elapsed mid-drag —
  // the drag-stop commit clears the dragging flag and saves then.
  // Cheap structural pre-check (O(N) reference compares) — selection
  // clicks and hover elevations must NOT trigger the expensive stringify +
  // write (a visible main-thread freeze on big canvases).
  const lastSavedRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);
  useEffect(() => {
    if (!isDraft) {
      lastSavedRef.current = null;
      return;
    }
    if (nodes.some((n) => n.dragging)) return;
    const prev = lastSavedRef.current;
    const unchanged =
      !!prev &&
      prev.edges === edges &&
      prev.nodes.length === nodes.length &&
      prev.nodes.every((p, i) => {
        const n = nodes[i];
        return (
          p.id === n.id &&
          p.data === n.data &&
          p.parentId === n.parentId &&
          p.hidden === n.hidden &&
          p.style === n.style &&
          p.position.x === n.position.x &&
          p.position.y === n.position.y
        );
      });
    if (unchanged) return;
    const timer = setTimeout(() => {
      lastSavedRef.current = { nodes, edges };
      saveDraftCanvas(nodes, edges);
    }, 400);
    return () => clearTimeout(timer);
  }, [isDraft, nodes, edges]);

  // Connect rules live in utils/draft-connect.ts (pure, unit-tested) — this
  // just injects the live dependencies.
  const { assignResourceToNetwork } = useDraftNetworkActions();
  const onNodeConnect = (connection: Connection) => {
    handleDraftConnect(connection, {
      nodes: reactFlow.getNodes(),
      peers,
      groups,
      networkResources,
      updateDraftPolicy,
      setPolicySourceResource,
      setPolicyDestinationResource,
      setPolicySourceGroups,
      setPolicyDestinationGroups,
      setPolicyInitialName,
      setCreatePolicyModal,
      onNetworkConnect: setNetworkDestinationPicker,
      onResourceAssign: assignResourceToNetwork,
      setPolicyDestinationScope,
    });
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
