"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { sortBy } from "lodash";
import {
  AccessControlModalContent,
  PolicyDestinationScope,
  AccessControlUpdateModal,
} from "@/modules/access-control/AccessControlModal";
import { Modal } from "@components/modal/Modal";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import { Group } from "@/interfaces/Group";
import { useGroups } from "@/contexts/GroupsProvider";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useReactFlow, XYPosition } from "@xyflow/react";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import {
  getDraftResource,
  getPlaceholderPeer,
  isDeployablePolicy,
} from "@/modules/control-center/utils/helpers";

interface PolicyContextType {
  // Edit existing policy
  selectedPolicy: string;
  setSelectedPolicy: (id: string) => void;
  policyModalOpen: boolean;
  setPolicyModalOpen: (open: boolean) => void;
  currentPolicy: Policy | undefined;
  handlePolicyChange: (updated: Policy) => void;
  // Draft: record an update change for the policy and redraw it on canvas.
  updateDraftPolicy: (policy: Policy) => void;
  // Draws a policy with its sources/destinations on the canvas — existing
  // nodes are connected, missing ones created (used when dropping an existing
  // policy from the components sidebar).
  drawPolicyOnCanvas: (policy: Policy, fallbackPosition?: XYPosition) => void;
  // Records a freshly built draft policy (client id, group changes, tracked
  // when deployable) and draws it — the create modal's save path, also used
  // by the network destination picker.
  addPolicyEdge: (policy: Policy) => void;
  // Where a dropped "new policy" template landed — the created policy node
  // falls back to this position when no matched nodes exist yet.
  setPolicyDropPosition: (position?: XYPosition) => void;
  // Create new policy (draft connect)
  createPolicyModal: boolean;
  setCreatePolicyModal: (open: boolean) => void;
  // Prefilled name, e.g. "All to New Group" when connecting two nodes.
  policyInitialName: string;
  setPolicyInitialName: (name: string) => void;
  policySourceResource: PolicyRuleResource | undefined;
  setPolicySourceResource: (r: PolicyRuleResource | undefined) => void;
  policyDestinationResource: PolicyRuleResource | undefined;
  setPolicyDestinationResource: (r: PolicyRuleResource | undefined) => void;
  policySourceGroups: Group[];
  setPolicySourceGroups: (g: Group[]) => void;
  policyDestinationGroups: Group[];
  setPolicyDestinationGroups: (g: Group[]) => void;
  // Restricts the create-policy modal's destination to a network's contents
  // (set when connecting onto a frame / framed resource / resource-group).
  setPolicyDestinationScope: (scope?: PolicyDestinationScope) => void;
}

const PolicyContext = createContext<PolicyContextType | null>(null);

export function useControlCenterPolicy(): PolicyContextType {
  const ctx = useContext(PolicyContext);
  if (!ctx) {
    throw new Error(
      "useControlCenterPolicy must be used within ControlCenterPolicyProvider",
    );
  }
  return ctx;
}

export function ControlCenterPolicyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { policies, peers, networkResources, networks, groups } =
    useControlCenterData();
  const { nodes, edges, setLayoutInitialized, refreshLiveViewRef } =
    useCanvasState();
  const { isDraft } = useDraftMode();
  const {
    changes,
    trackCreatePolicy,
    trackUpdatePolicy,
    trackDeletePolicy,
    trackCreateGroup,
    removeChange,
  } = useDraftChangeset();
  const { setDropdownOptions } = useGroups();
  const reactFlow = useReactFlow();

  const [selectedPolicy, setSelectedPolicy] = useState("");
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [createPolicyModal, setCreatePolicyModal] = useState(false);
  const [policyInitialName, setPolicyInitialName] = useState("");
  const [policyDestinationScope, setPolicyDestinationScope] = useState<
    PolicyDestinationScope | undefined
  >(undefined);
  const [policySourceResource, setPolicySourceResource] =
    useState<PolicyRuleResource>();
  const [policyDestinationResource, setPolicyDestinationResource] =
    useState<PolicyRuleResource>();
  const [policySourceGroups, setPolicySourceGroups] = useState<Group[]>([]);
  const [policyDestinationGroups, setPolicyDestinationGroups] = useState<
    Group[]
  >([]);

  // The canvas node carries the freshest policy state: in draft the pending
  // edits/toggles, in live the just-saved PUT response (refreshLiveView
  // patches the node before the SWR cache revalidates). The API list is the
  // fallback.
  const currentPolicy = useMemo(() => {
    if (!selectedPolicy) return undefined;
    const node = nodes.find((n) => n.id === `policy-${selectedPolicy}`);
    const nodePolicy = (node?.data as any)?.policy as Policy | undefined;
    if (nodePolicy) return nodePolicy;
    return policies?.find((p) => p.id === selectedPolicy);
  }, [policies, selectedPolicy, nodes]);

  // Live-mode save: the canvas is patched in place from the PUT response —
  // no layoutInitialized reset, no waiting for the SWR /policies
  // revalidation (that lands in the background and matches what's already
  // drawn). refreshLiveView rebuilds the current view with the fresh policy,
  // keeping positions and camera.
  const handlePolicyChange = (updated: Policy) => {
    refreshLiveViewRef.current(updated);
    setTimeout(() => {
      setSelectedPolicy("");
      setPolicyModalOpen(false);
    }, 500);
  };

  // Draft groups must be selectable in the policy modal's group selectors —
  // synced from the canvas as client-side options while drafting. Groups
  // marked for deletion are excluded (they're gone after deploy) and restored
  // if the delete change is discarded.
  useEffect(() => {
    if (!isDraft || !setDropdownOptions) return;
    const draftGroups = new Map<string, Group>();
    nodes.forEach((n) => {
      const g = (n.data as any)?.group as Group | undefined;
      if (g && !g.id) draftGroups.set(g.name, g);
    });
    const pendingDeleteIds = new Set(
      changes
        .filter((c) => c.type === "delete-group")
        .map((c) => (c.type === "delete-group" ? c.groupId : "")),
    );
    setDropdownOptions((prev) => {
      // Prune draft options that left the canvas (removed/renamed groups)
      // and groups pending deletion.
      const kept = prev.filter((g) =>
        g.id ? !pendingDeleteIds.has(g.id) : draftGroups.has(g.name),
      );
      const known = new Set(kept.map((g) => g.name));
      const additions: Group[] = [
        ...[...draftGroups.values()]
          .filter((g) => !known.has(g.name))
          .map((g) => ({ ...g, keepClientState: true })),
        // Restore API groups whose pending deletion was discarded.
        ...(groups ?? []).filter(
          (g) => g.id && !pendingDeleteIds.has(g.id) && !known.has(g.name),
        ),
      ];
      if (additions.length === 0 && kept.length === prev.length) return prev;
      return sortBy([...kept, ...additions], "name");
    });
  }, [nodes, isDraft, changes, groups, setDropdownOptions]);

  // Draft-only options (no id) are removed once the draft is left.
  useEffect(() => {
    if (isDraft || !setDropdownOptions) return;
    setDropdownOptions((prev) => {
      const kept = prev.filter((g) => g.id);
      return kept.length === prev.length ? prev : kept;
    });
  }, [isDraft, setDropdownOptions]);

  // Groups can also be typed directly into the modal's selector — every
  // id-less group referenced by a draft policy needs a create-group change.
  const ensureDraftGroupChanges = (policy: Policy) => {
    const rule = policy.rules?.[0];
    if (!rule) return;
    const referenced = [
      ...(((rule.sources as (Group | string)[]) ?? []) || []),
      ...(((rule.destinations as (Group | string)[]) ?? []) || []),
    ];
    referenced.forEach((g) => {
      if (typeof g === "string" || g.id) return;
      const exists = changes.some(
        (c) => c.type === "create-group" && c.name === g.name,
      );
      if (!exists) {
        trackCreateGroup({ clientId: `group-new-${g.name}`, name: g.name });
      }
    });
  };

  // Placeholder peers (Server / Agent, not installed) as pseudo-peers — shown
  // and selectable in the policy modal's peer selector with their draft ids.
  const placeholderPeers = useMemo(
    () =>
      nodes
        .map((n) => getPlaceholderPeer(n))
        .filter(Boolean) as NonNullable<ReturnType<typeof getPlaceholderPeer>>[],
    [nodes],
  );

  // Draft resources as pseudo-resources — selectable policy destinations
  // with their "new-…" ids (mirror of placeholderPeers).
  const draftResources = useMemo(
    () =>
      nodes
        .map((n) => getDraftResource(n))
        .filter(Boolean) as NonNullable<ReturnType<typeof getDraftResource>>[],
    [nodes],
  );

  // Where the last "new policy" template was dropped.
  const policyDropPositionRef = React.useRef<XYPosition | undefined>(undefined);
  const setPolicyDropPosition = (position?: XYPosition) => {
    policyDropPositionRef.current = position;
  };

  // Draws (or redraws) a policy's node and edges on the canvas: missing
  // source/destination nodes are created, the policy node's data is updated
  // and its edges are fully replaced (an edit can change sources/destinations).
  const drawPolicyOnCanvas = (policy: Policy, fallbackPosition?: XYPosition) => {
    const rule = policy?.rules?.[0];
    if (!rule) return;

    const enabled = policy?.enabled;
    const edgeType = isDraft ? "smart" : "in";
    const policyNodeId = `policy-${policy.id}`;

    const currentNodes = reactFlow.getNodes();
    const findNode = (id: string) => currentNodes.find((n) => n.id === id);

    const newNodes: any[] = [];
    const policyEdges: any[] = [];

    // Anchor for nodes that don't exist yet: sources stack to the left of it,
    // destinations to the right (used when dropping a policy from the
    // sidebar; connect-created policies always have their endpoints already).
    // When editing a policy already on canvas, its own position is the anchor.
    const base = fallbackPosition ??
      findNode(policyNodeId)?.position ?? { x: 0, y: 0 };
    let newSourceCount = 0;
    let newDestCount = 0;

    // Helper: ensure a node exists on canvas, create if missing.
    // Returns true when a new node was added.
    const ensureNode = (
      id: string,
      type: string,
      data: any,
      position?: XYPosition,
    ) => {
      if (!findNode(id) && !newNodes.some((n) => n.id === id)) {
        newNodes.push({
          id,
          type,
          data,
          position: position ?? { x: 0, y: 0 },
        });
        return true;
      }
      return false;
    };


    // All of the policy's edges are rebuilt — stale ones are dropped when the
    // canvas is updated below.
    const pushEdge = (id: string, source: string, target: string) => {
      if (!policyEdges.some((e) => e.id === id)) {
        policyEdges.push({
          id,
          source,
          target,
          type: edgeType,
          data: { enabled, policy },
        });
      }
    };

    // Detect self-referencing groups. Draft groups have no id yet — their
    // (unique) name stands in as the key.
    const groupKey = (g: Group | string) =>
      typeof g === "string" ? g : g.id ?? g.name;
    const sourceGroupIds = new Set(
      ((rule.sources as Group[]) ?? []).map(groupKey).filter(Boolean),
    );
    const destGroupIds = new Set(
      ((rule.destinations as Group[]) ?? []).map(groupKey).filter(Boolean),
    );

    // Helper: find an existing group node by ID or by group name
    const findGroupNode = (gid: string, groupName?: string) => {
      // Try exact ID match first
      const byId = findNode(`group-${gid}`);
      if (byId) return `group-${gid}`;
      // Try matching by group name in node data (for draft groups with different IDs)
      if (groupName) {
        const byName = currentNodes.find(
          (n) =>
            (n.type === "groupNode" ||
              n.type === "sourceGroupNode" ||
              n.type === "destinationGroupNode") &&
            (n.data as any)?.group?.name === groupName,
        );
        if (byName) return byName.id;
      }
      return undefined;
    };

    // New side nodes join the EXISTING column: aligned to its x, stacked
    // below its lowest node — what Auto Arrange would produce — instead of
    // landing at the anchor, which put new sources above the source column
    // and new destinations below the policy when editing a policy in place.
    const sideColumnPositions = (groups: (Group | string)[] | undefined) => {
      const positions: XYPosition[] = [];
      for (const g of groups ?? []) {
        const gid = groupKey(g);
        if (!gid) continue;
        const nodeId = findGroupNode(
          gid,
          typeof g === "string" ? undefined : g.name,
        );
        const node = nodeId ? findNode(nodeId) : undefined;
        if (node) positions.push(node.position);
      }
      return positions;
    };
    const sourceColumn = sideColumnPositions(rule.sources as Group[]);
    const destColumn = sideColumnPositions(rule.destinations as Group[]);

    const nextInColumn = (
      column: XYPosition[],
      newCount: number,
      fallbackX: number,
    ): XYPosition =>
      column.length
        ? {
            x: Math.min(...column.map((p) => p.x)),
            y: Math.max(...column.map((p) => p.y)) + (newCount + 1) * 110,
          }
        : { x: fallbackX, y: base.y + newCount * 110 };

    const nextSourcePosition = () =>
      nextInColumn(sourceColumn, newSourceCount, base.x - 450);
    const nextDestPosition = () =>
      nextInColumn(destColumn, newDestCount, base.x + 450);

    // --- Source nodes ---
    const sourceNodeIds: string[] = [];

    // Draft groups without an id get a "group-new-" node id so later
    // connections from them resolve (see parseNodeId in useDraft).
    const fallbackGroupNodeId = (g: Group | string | undefined, gid: string) =>
      typeof g === "object" && !g.id ? `group-new-${gid}` : `group-${gid}`;

    // Source groups
    for (const source of (rule.sources as Group[]) ?? []) {
      const gid = groupKey(source);
      if (!gid) continue;
      const group = typeof source === "string" ? undefined : source;
      const existingNodeId = findGroupNode(gid, group?.name);
      const nodeId = existingNodeId ?? fallbackGroupNodeId(source, gid);
      if (
        ensureNode(
          nodeId,
          "groupNode",
          {
            group: group ?? { id: gid, name: gid },
            enabled,
            showHandles: true,
          },
          nextSourcePosition(),
        )
      ) {
        newSourceCount++;
      }
      sourceNodeIds.push(nodeId);
    }

    // Source resource (peer)
    const sourceResource = rule.sourceResource;
    if (sourceResource?.id && sourceResource.type === "peer") {
      const peer = peers?.find((p) => p.id === sourceResource.id);
      if (peer) {
        const nodeId = `peer-${peer.id}`;
        if (
          ensureNode(
            nodeId,
            "peerNode",
            {
              peer,
              enabled: true,
              showHandles: true,
              variant: "card",
            },
            nextSourcePosition(),
          )
        ) {
          newSourceCount++;
        }
        sourceNodeIds.push(nodeId);
      } else if (findNode(`peer-${sourceResource.id}`)) {
        // Placeholder peer (not installed) — connect its existing node.
        sourceNodeIds.push(`peer-${sourceResource.id}`);
      }
    }

    // --- Destination nodes ---
    const destNodeIds: string[] = [];

    // Destination groups
    for (const dest of (rule.destinations as Group[]) ?? []) {
      const gid = groupKey(dest);
      if (!gid) continue;
      const group = typeof dest === "string" ? undefined : dest;

      // Check if this group is also a source (self-ref) — match by ID or name
      const isSelfRef =
        sourceGroupIds.has(gid) ||
        (group?.name &&
          sourceNodeIds.some((sid) => {
            const n = findNode(sid) ?? newNodes.find((nn: any) => nn.id === sid);
            return (n?.data as any)?.group?.name === group.name;
          }));

      // Find existing destination node by ID or name
      const existingDestNode = findGroupNode(gid, group?.name);

      let nodeId: string;
      if (!isSelfRef) {
        nodeId = existingDestNode ?? fallbackGroupNodeId(dest, gid);
      } else {
        // Self-ref: look for existing dest copy, then create one
        const existingDestCopy =
          currentNodes.find(
            (n) =>
              n.type === "destinationGroupNode" &&
              ((n.data as any)?.group?.name === group?.name ||
                n.id === `group-${gid}` ||
                n.id.startsWith(`dest-group-${gid}-`)),
          )?.id ??
          newNodes.find(
            (nn: any) =>
              nn.type === "destinationGroupNode" &&
              (nn.data?.group?.name === group?.name ||
                nn.id.startsWith(`dest-group-${gid}-`)),
          )?.id;

        nodeId = existingDestCopy ?? `dest-group-${gid}-${policy.id}`;
      }

      if (
        ensureNode(
          nodeId,
          "destinationGroupNode",
          {
            group: group ?? { id: gid, name: gid },
            enabled,
            showHandles: true,
          },
          nextDestPosition(),
        )
      ) {
        newDestCount++;
      }
      destNodeIds.push(nodeId);
    }

    // Destination resource
    const destResource = rule.destinationResource;
    if (destResource?.id) {
      if (destResource.type === "peer") {
        const peer = peers?.find((p) => p.id === destResource.id);
        if (peer) {
          const nodeId = `peer-${peer.id}`;
          if (
            ensureNode(
              nodeId,
              "peerNode",
              {
                peer,
                enabled: true,
                showHandles: true,
                variant: "card",
              },
              nextDestPosition(),
            )
          ) {
            newDestCount++;
          }
          destNodeIds.push(nodeId);
        } else if (findNode(`peer-${destResource.id}`)) {
          // Placeholder peer (not installed) — connect its existing node.
          destNodeIds.push(`peer-${destResource.id}`);
        }
      } else {
        const resource = networkResources?.find(
          (r) => r.id === destResource.id,
        );
        if (resource) {
          const nodeId = `resource-${resource.id}`;
          // Stamp the owning network (like the sidebar's resource drop) so
          // the standalone card shows its name instead of "No Network".
          const owningNetwork = networks?.find((n) =>
            n.resources?.some((rid) => rid === resource.id),
          );
          if (
            ensureNode(
              nodeId,
              "resourceNode",
              {
                resource,
                enabled,
                showHandles: true,
                draftNetwork: owningNetwork?.id
                  ? { networkId: owningNetwork.id, name: owningNetwork.name }
                  : undefined,
              },
              nextDestPosition(),
            )
          ) {
            newDestCount++;
          }
          destNodeIds.push(nodeId);
        } else if (findNode(`resource-${destResource.id}`)) {
          // Draft resource ("new-…") — connect its existing node.
          destNodeIds.push(`resource-${destResource.id}`);
        }
      }
    }

    // --- Position policy node between sources and destinations ---
    const allExistingNodes = [...sourceNodeIds, ...destNodeIds]
      .map((id) => findNode(id))
      .filter(Boolean);

    // An explicit drop position always wins — the policy lands exactly where
    // it was dropped and the missing pieces attach around it. Centering on
    // the matched nodes is only for flows without a drop point (connect-drag,
    // modal edits).
    let centerX = base.x;
    let centerY = base.y;
    if (!fallbackPosition && allExistingNodes.length > 0) {
      const bounds = reactFlow.getNodesBounds(allExistingNodes as any);
      centerX = bounds.x + bounds.width / 2;
      centerY = bounds.y + bounds.height / 2;
    }

    // Add policy node
    if (!findNode(policyNodeId)) {
      newNodes.push({
        id: policyNodeId,
        type: "policyNode",
        data: { policy },
        position: { x: centerX, y: centerY },
      });
    }

    // --- Edges ---
    for (const sourceId of sourceNodeIds) {
      pushEdge(`${sourceId}-${policyNodeId}`, sourceId, policyNodeId);
    }
    for (const destId of destNodeIds) {
      pushEdge(`${policyNodeId}-${destId}`, policyNodeId, destId);
    }

    // Apply: refresh the policy node's data, add missing nodes, and replace
    // every edge of this policy with the rebuilt set.
    reactFlow.setNodes((prev) =>
      prev
        .map((n) =>
          n.id === policyNodeId ? { ...n, data: { ...n.data, policy } } : n,
        )
        .concat(newNodes),
    );
    reactFlow.setEdges((prev) =>
      prev
        .filter((e) => e.source !== policyNodeId && e.target !== policyNodeId)
        .concat(policyEdges),
    );
  };

  // Create flow (drag-connect → modal). In draft the modal returns pure
  // policy data (useSave=false): record the change, give the policy a client
  // id and draw it — the API call happens on deploy.
  const addPolicyEdge = (policy: Policy) => {
    setCreatePolicyModal(false);
    setPolicyInitialName("");
    setPolicySourceResource(undefined);
    setPolicyDestinationResource(undefined);
    setPolicySourceGroups([]);
    setPolicyDestinationGroups([]);
    setPolicyDestinationScope(undefined);

    if (isDraft && !policy?.id) {
      const clientId = `new-${
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now()
      }`;
      policy = { ...policy, id: clientId };
      ensureDraftGroupChanges(policy);
      // Policies referencing uninstalled placeholder peers aren't deployable
      // — they stay out of the changeset (like blank policies) until real.
      if (isCompletePolicy(policy)) {
        trackCreatePolicy({ clientId, policy });
      }
    }

    drawPolicyOnCanvas(policy, policyDropPositionRef.current);
    policyDropPositionRef.current = undefined;
  };

  // Shared with the unit tests — see isDeployablePolicy in utils/helpers.
  // Policies referencing draft resources are deployable only while the
  // resource is tracked (complete).
  const trackedResourceClientIds = useMemo(
    () =>
      new Set(
        changes
          .filter((c) => c.type === "create-resource")
          .map((c) => (c.type === "create-resource" ? c.clientId : "")),
      ),
    [changes],
  );
  const isCompletePolicy = (policy: Policy) =>
    isDeployablePolicy(policy, trackedResourceClientIds);

  // Applies an edited policy to the draft: record an update change and redraw
  // — draft-created policies just update their create change. Used by the
  // edit modal and by policy-handle drags (add source/destination).
  const updateDraftPolicy = (policy: Policy) => {
    if (!policy.id) return;
    ensureDraftGroupChanges(policy);
    // Blank dropped policies ("new-…" without a create change) stay out of
    // the changeset until they're real: the first edit/connect that gives
    // them both a source and a destination records their create change.
    if (policy.id.startsWith("new-")) {
      const hasCreateChange = changes.some(
        (c) => c.type === "create-policy" && c.clientId === policy.id,
      );
      if (!hasCreateChange) {
        if (isCompletePolicy(policy)) {
          trackCreatePolicy({ clientId: policy.id, policy });
        }
        drawPolicyOnCanvas(policy);
        return;
      }
      // Tracked but no longer deployable (e.g. a placeholder peer replaced a
      // group) — drop the pending create until it's real again.
      if (!isCompletePolicy(policy)) {
        trackDeletePolicy({ policyId: policy.id, name: policy.name ?? "Policy" });
        drawPolicyOnCanvas(policy);
        return;
      }
    }
    // Existing policies: an incomplete state (e.g. its single-peer source
    // was removed from the canvas) isn't deployable — a pending edit would
    // ship that broken state, so it's dropped; the API policy stays as-is
    // until the draft completes it again.
    if (!isCompletePolicy(policy)) {
      const pending = changes.find(
        (c) => c.type === "update-policy" && c.policyId === policy.id,
      );
      if (pending) removeChange(pending.id);
      drawPolicyOnCanvas(policy);
      return;
    }
    trackUpdatePolicy({ policyId: policy.id, policy });
    drawPolicyOnCanvas(policy);
  };

  // Edit flow (policy modal in draft, useSave=false).
  const handleDraftPolicyUpdate = (updated: Policy) => {
    if (!selectedPolicy) return;
    updateDraftPolicy({ ...updated, id: selectedPolicy });
    setTimeout(() => {
      setSelectedPolicy("");
      setPolicyModalOpen(false);
    }, 500);
  };

  const value = useMemo(
    () => ({
      selectedPolicy,
      setSelectedPolicy,
      policyModalOpen,
      setPolicyModalOpen,
      currentPolicy,
      handlePolicyChange,
      updateDraftPolicy,
      drawPolicyOnCanvas,
      addPolicyEdge,
      setPolicyDropPosition,
      createPolicyModal,
      setCreatePolicyModal,
      policyInitialName,
      setPolicyInitialName,
      policySourceResource,
      setPolicySourceResource,
      policyDestinationResource,
      setPolicyDestinationResource,
      policySourceGroups,
      setPolicySourceGroups,
      policyDestinationGroups,
      setPolicyDestinationGroups,
      setPolicyDestinationScope,
    }),
    [
      selectedPolicy,
      policyModalOpen,
      currentPolicy,
      createPolicyModal,
      policyInitialName,
      policySourceResource,
      policyDestinationResource,
      policySourceGroups,
      policyDestinationGroups,
      // updateDraftPolicy/drawPolicyOnCanvas close over the changeset, draft
      // flag and entity data — keep the memoized value fresh so consumers
      // (onNodeConnect, sidebar drops) don't act on stale state.
      changes,
      isDraft,
      peers,
      networkResources,
      networks,
    ],
  );

  return (
    <PolicyContext.Provider value={value}>
      {currentPolicy && (
        <AccessControlUpdateModal
          policy={currentPolicy}
          open={policyModalOpen}
          // In draft the modal must not call the API — edits are recorded as
          // update-policy changes and applied on deploy.
          useSave={!isDraft}
          additionalPeers={isDraft ? placeholderPeers : undefined}
          additionalResources={isDraft ? draftResources : undefined}
          onSuccess={(p) =>
            isDraft ? handleDraftPolicyUpdate(p) : handlePolicyChange(p)
          }
          onOpenChange={setPolicyModalOpen}
        />
      )}
      {createPolicyModal && (
        <Modal open={createPolicyModal} onOpenChange={setCreatePolicyModal}>
          <AccessControlModalContent
            key={createPolicyModal ? 1 : 0}
            onSuccess={addPolicyEdge}
            // In draft the modal must not call the API — it hands the policy
            // data back and the changeset applies it on deploy.
            useSave={!isDraft}
            initialName={policyInitialName || undefined}
            initialSourceResource={policySourceResource}
            initialDestinationResource={policyDestinationResource}
            initialSourceGroups={policySourceGroups}
            initialDestinationGroups={policyDestinationGroups}
            additionalPeers={isDraft ? placeholderPeers : undefined}
            additionalResources={isDraft ? draftResources : undefined}
            destinationScope={policyDestinationScope}
          />
        </Modal>
      )}
      {children}
    </PolicyContext.Provider>
  );
}
