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
import AgentPolicyModal from "@/modules/agent-network/AgentPolicyModal";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import { Modal } from "@components/modal/Modal";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import { Group } from "@/interfaces/Group";
import { useGroups } from "@/contexts/GroupsProvider";
import { useDialog } from "@/contexts/DialogProvider";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
import { useReactFlow, XYPosition } from "@xyflow/react";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import {
  getDraftResource,
  getPlaceholderPeer,
  isTrackablePolicy,
} from "@/modules/control-center/utils/helpers";

interface PolicyContextType {
  setSelectedPolicy: (id: string) => void;
  setPolicyModalOpen: (open: boolean) => void;
  updateDraftPolicy: (policy: Policy) => void;
  drawPolicyOnCanvas: (policy: Policy, fallbackPosition?: XYPosition) => void;
  setCreatePolicyModal: (open: boolean) => void;
  setPolicyInitialName: (name: string) => void;
  setPolicySourceResource: (r: PolicyRuleResource | undefined) => void;
  setPolicyDestinationResource: (r: PolicyRuleResource | undefined) => void;
  setPolicySourceGroups: (g: Group[]) => void;
  setPolicyDestinationGroups: (g: Group[]) => void;
  // Restricts the create-policy modal's destination to a network's contents.
  setPolicyDestinationScope: (scope?: PolicyDestinationScope) => void;
  openAgentPolicy: (id: string) => void;
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
  const { nodes, refreshLiveViewRef } = useCanvasState();
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
  const { confirm } = useDialog();

  // Live edits apply to the account immediately, so confirm before the PUT.
  const confirmLivePolicySave = () =>
    confirm({
      title: "Save policy changes?",
      description:
        "You are in live mode. Saving your changes will apply them to your account immediately.",
      confirmText: "Save",
      cancelText: "Cancel",
      type: "warning",
      dismissOnOutsideClick: true,
    });

  const [selectedPolicy, setSelectedPolicy] = useState("");
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  // Agent-network policies live in their own domain, not /policies, so they
  // need their own modal.
  const [selectedAgentPolicy, setSelectedAgentPolicy] = useState("");
  const [agentPolicyModalOpen, setAgentPolicyModalOpen] = useState(false);
  const { policies: agentPolicyDomain } = useAIProviders();
  const currentAgentPolicy = useMemo(
    () => agentPolicyDomain?.find((p) => p.id === selectedAgentPolicy),
    [agentPolicyDomain, selectedAgentPolicy],
  );
  const openAgentPolicy = (id: string) => {
    setSelectedAgentPolicy(id);
    setAgentPolicyModalOpen(true);
  };
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

  // The canvas node has the freshest policy state; the API list is the fallback.
  const currentPolicy = useMemo(() => {
    if (!selectedPolicy) return undefined;
    const node = nodes.find((n) => n.id === `policy-${selectedPolicy}`);
    const nodePolicy = (node?.data as any)?.policy as Policy | undefined;
    if (nodePolicy) return nodePolicy;
    return policies?.find((p) => p.id === selectedPolicy);
  }, [policies, selectedPolicy, nodes]);

  // Patch the canvas from the PUT response so positions and camera survive.
  const handlePolicyChange = (updated: Policy) => {
    refreshLiveViewRef.current(updated);
    setTimeout(() => {
      setSelectedPolicy("");
      setPolicyModalOpen(false);
    }, 500);
  };

  // Draft groups must be selectable in the policy modal's group selectors,
  // groups marked for deletion must not.
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

  useEffect(() => {
    if (isDraft || !setDropdownOptions) return;
    setDropdownOptions((prev) => {
      const kept = prev.filter((g) => g.id);
      return kept.length === prev.length ? prev : kept;
    });
  }, [isDraft, setDropdownOptions]);

  // Groups typed into the modal's selector have no id yet, so a draft policy
  // referencing one still needs a create-group change.
  const ensureDraftGroupChanges = (policy: Policy) => {
    const rule = policy.rules?.[0];
    if (!rule) return;
    const referenced = [
      ...((rule.sources as (Group | string)[]) ?? []),
      ...((rule.destinations as (Group | string)[]) ?? []),
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

  // Uninstalled placeholders stay selectable in the modal's peer selector.
  const placeholderPeers = useMemo(
    () =>
      nodes
        .map((n) => getPlaceholderPeer(n))
        .filter(Boolean) as NonNullable<ReturnType<typeof getPlaceholderPeer>>[],
    [nodes],
  );

  const draftResources = useMemo(
    () =>
      nodes
        .map((n) => getDraftResource(n))
        .filter(Boolean) as NonNullable<ReturnType<typeof getDraftResource>>[],
    [nodes],
  );

  // The policy's edges are replaced wholesale: an edit can change either side.
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

    // Anchor for new nodes: sources stack to its left, destinations right.
    const base = fallbackPosition ??
      findNode(policyNodeId)?.position ?? { x: 0, y: 0 };
    let newSourceCount = 0;
    let newDestCount = 0;

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

    // Draft groups have no id yet, so their unique name stands in as the key.
    const groupKey = (g: Group | string) =>
      typeof g === "string" ? g : g.id ?? g.name;
    const sourceGroupIds = new Set(
      ((rule.sources as Group[]) ?? []).map(groupKey).filter(Boolean),
    );
    const destGroupIds = new Set(
      ((rule.destinations as Group[]) ?? []).map(groupKey).filter(Boolean),
    );

    const findGroupNode = (gid: string, groupName?: string) => {
      const byId = findNode(`group-${gid}`);
      if (byId) return `group-${gid}`;
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

    // New side nodes join the existing column so they land where Auto Arrange
    // would put them, not at the anchor.
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

    const sourceNodeIds: string[] = [];

    // Draft groups need a `group-new-` node id so later connections resolve.
    const fallbackGroupNodeId = (g: Group | string | undefined, gid: string) =>
      typeof g === "object" && !g.id ? `group-new-${gid}` : `group-${gid}`;

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
        sourceNodeIds.push(`peer-${sourceResource.id}`);
      }
    }

    const destNodeIds: string[] = [];

    for (const dest of (rule.destinations as Group[]) ?? []) {
      const gid = groupKey(dest);
      if (!gid) continue;
      const group = typeof dest === "string" ? undefined : dest;

      const isSelfRef =
        sourceGroupIds.has(gid) ||
        (group?.name &&
          sourceNodeIds.some((sid) => {
            const n = findNode(sid) ?? newNodes.find((nn: any) => nn.id === sid);
            return (n?.data as any)?.group?.name === group.name;
          }));

      const existingDestNode = findGroupNode(gid, group?.name);

      let nodeId: string;
      if (!isSelfRef) {
        nodeId = existingDestNode ?? fallbackGroupNodeId(dest, gid);
      } else {
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
          destNodeIds.push(`peer-${destResource.id}`);
        }
      } else {
        const resource = networkResources?.find(
          (r) => r.id === destResource.id,
        );
        if (resource) {
          const nodeId = `resource-${resource.id}`;
          // Without the owning network the standalone card reads "No Network".
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
          destNodeIds.push(`resource-${destResource.id}`);
        }
      }
    }

    const allExistingNodes = [...sourceNodeIds, ...destNodeIds]
      .map((id) => findNode(id))
      .filter(Boolean);

    // An explicit drop position wins; otherwise center on the matched nodes.
    let policyPos = { x: base.x, y: base.y };
    if (!fallbackPosition && allExistingNodes.length > 0) {
      const bounds = reactFlow.getNodesBounds(allExistingNodes as any);
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      // A node's `position` is its top-left, so subtract half its own size.
      // The pill has no fixed width; estimate it from the name.
      const POLICY_NODE_HEIGHT = 36;
      const name = policy.rules?.[0]?.name ?? policy.name ?? "";
      const policyNodeWidth = Math.min(248, 64 + Math.min(name.length, 26) * 7);
      policyPos = {
        x: centerX - policyNodeWidth / 2,
        y: centerY - POLICY_NODE_HEIGHT / 2,
      };
    }

    if (!findNode(policyNodeId)) {
      newNodes.push({
        id: policyNodeId,
        type: "policyNode",
        data: { policy },
        position: policyPos,
      });
    }

    for (const sourceId of sourceNodeIds) {
      pushEdge(`${sourceId}-${policyNodeId}`, sourceId, policyNodeId);
    }
    for (const destId of destNodeIds) {
      pushEdge(`${policyNodeId}-${destId}`, policyNodeId, destId);
    }

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

  // In draft the modal returns pure policy data; the API call happens on deploy.
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
      // Blank or one-sided policies stay canvas-only.
      if (isCompletePolicy(policy)) {
        trackCreatePolicy({ clientId, policy });
      }
    }

    drawPolicyOnCanvas(policy);
  };

  // A policy on a draft resource is trackable only while that resource is.
  const trackedResourceClientIds = useMemo(
    () =>
      new Set(
        changes
          .filter((c) => c.type === "create-resource")
          .map((c) => (c.type === "create-resource" ? c.clientId : "")),
      ),
    [changes],
  );
  // A tracked policy may reference an uninstalled placeholder; that peer's own
  // install-peer issue is what blocks the deploy.
  const isCompletePolicy = (policy: Policy) =>
    isTrackablePolicy(policy, trackedResourceClientIds);

  const updateDraftPolicy = (policy: Policy) => {
    if (!policy.id) return;
    ensureDraftGroupChanges(policy);
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
      // A side was emptied: drop the pending create until it is complete again.
      if (!isCompletePolicy(policy)) {
        trackDeletePolicy({ policyId: policy.id, name: policy.name ?? "Policy" });
        drawPolicyOnCanvas(policy);
        return;
      }
    }
    // A pending edit on an incomplete policy would ship that broken state.
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
      setSelectedPolicy,
      setPolicyModalOpen,
      updateDraftPolicy,
      drawPolicyOnCanvas,
      setCreatePolicyModal,
      setPolicyInitialName,
      setPolicySourceResource,
      setPolicyDestinationResource,
      setPolicySourceGroups,
      setPolicyDestinationGroups,
      setPolicyDestinationScope,
      openAgentPolicy,
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
      // The callbacks close over these, so consumers would see stale state.
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
          // In draft the modal must not call the API; edits apply on deploy.
          useSave={!isDraft}
          onBeforeSave={isDraft ? undefined : confirmLivePolicySave}
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
            onSuccess={addPolicyEdge}
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
      <AgentPolicyModal
        open={agentPolicyModalOpen}
        onOpenChange={setAgentPolicyModalOpen}
        policy={currentAgentPolicy}
      />
      {children}
    </PolicyContext.Provider>
  );
}
