"use client";

import { Modal } from "@components/modal/Modal";
import { useReactFlow, XYPosition } from "@xyflow/react";
import { sortBy } from "lodash";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useDialog } from "@/contexts/DialogProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import { Group } from "@/interfaces/Group";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import {
  AccessControlModalContent,
  AccessControlUpdateModal,
  PolicyDestinationScope,
} from "@/modules/access-control/AccessControlModal";
import AgentPolicyModal from "@/modules/agent-network/AgentPolicyModal";
import AIProviderModal, {
  MASKED_API_KEY,
} from "@/modules/agent-network/AIProviderModal";
import {
  providerFromDraftInput,
  useAIProviders,
} from "@/modules/agent-network/AIProvidersProvider";
import {
  type AgentPolicy,
  type AIProvider,
  EMPTY_POLICY_LIMITS,
} from "@/modules/agent-network/data/mockData";
import { useCanvasState } from "@/modules/control-center/contexts/ControlCenterContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useDraftNodeCreation } from "@/modules/control-center/hooks/useDraftNodeCreation";
import { draftUid } from "@/modules/control-center/utils/helpers";
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
  openProvider: (id: string) => void;
  updateDraftAgentPolicy: (policy: AgentPolicy) => void;
  setAgentSourceGroup: (policy: AgentPolicy, groupRef: string) => void;
  drawAgentPolicyOnCanvas: (policy: AgentPolicy) => void;
  openProviderWizard: (position?: XYPosition) => void;
  openAgentPolicyWizard: (
    prefill: { sourceGroups: string[]; destinationProviderIds: string[] },
    position?: XYPosition,
  ) => void;
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
    patchPendingPolicyUpdate,
    trackCreateProvider,
    trackUpdateProvider,
    trackCreateAgentPolicy,
    trackUpdateAgentPolicy,
    trackDeleteAgentPolicy,
    patchPendingAgentPolicyUpdate,
  } = useDraftChangeset();
  const { placeProviderNode, placeAgentPolicyNode } = useDraftNodeCreation();
  const { setDropdownOptions } = useGroups();
  const reactFlow = useReactFlow();
  const { confirm } = useDialog();

  const patchAgentNode = (nodeId: string, data: Record<string, unknown>) =>
    reactFlow.setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
      ),
    );

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

  const confirmLiveAgentSave = () =>
    confirm({
      title: "Save changes?",
      description: isDraft
        ? "Agent Network changes aren't part of the draft. Saving applies them to your account immediately."
        : "You are in live mode. Saving your changes will apply them to your account immediately.",
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
  const {
    policies: agentPolicyDomain,
    providers: agentProviders,
    editingProvider,
    openProviderEdit,
    closeProviderEdit,
  } = useAIProviders();
  const [agentPolicyWizard, setAgentPolicyWizard] = useState<{
    policy: AgentPolicy;
    position?: XYPosition;
  } | null>(null);

  const currentAgentPolicy = useMemo(() => {
    if (!selectedAgentPolicy) return undefined;
    if (selectedAgentPolicy.startsWith("new-")) {
      const node = nodes.find(
        (n) => n.id === `agent-policy-${selectedAgentPolicy}`,
      );
      const create = changes.find(
        (c) =>
          c.type === "create-agent-policy" &&
          c.clientId === selectedAgentPolicy,
      );
      const policy =
        (node?.data as { policy?: AgentPolicy })?.policy ??
        (create?.type === "create-agent-policy" ? create.policy : undefined);
      return policy
        ? ({ ...policy, id: selectedAgentPolicy } as AgentPolicy)
        : undefined;
    }
    const live = agentPolicyDomain?.find((p) => p.id === selectedAgentPolicy);
    const pending = changes.find(
      (c) =>
        c.type === "update-agent-policy" &&
        c.agentPolicyId === selectedAgentPolicy,
    );
    if (pending?.type !== "update-agent-policy") return live;
    return {
      ...(live ?? {}),
      ...pending.policy,
      id: selectedAgentPolicy,
    } as AgentPolicy;
  }, [agentPolicyDomain, selectedAgentPolicy, nodes, changes]);

  const isTrackableAgentPolicy = (policy: {
    sourceGroups: string[];
    destinationProviderIds: string[];
  }) =>
    policy.sourceGroups.length > 0 && policy.destinationProviderIds.length > 0;
  const openAgentPolicy = (id: string) => {
    setSelectedAgentPolicy(id);
    setAgentPolicyModalOpen(true);
  };
  const draftProviders = useMemo(
    () =>
      changes.flatMap((c) =>
        c.type === "create-provider"
          ? [providerFromDraftInput(c.clientId, c.input)]
          : [],
      ),
    [changes],
  );
  const draftProvider = (id: string) => draftProviders.find((p) => p.id === id);

  const draftProviderNames = useMemo(
    () => draftProviders.map((p) => p.name),
    [draftProviders],
  );

  const draftAgentPolicyNames = useMemo(
    () => [
      ...nodes.flatMap((n) =>
        n.type === "agentPolicyNode"
          ? [(n.data as { name?: string })?.name ?? ""]
          : [],
      ),
      ...changes.flatMap((c) =>
        c.type === "create-agent-policy" ? [c.name] : [],
      ),
    ],
    [nodes, changes],
  );

  const openProvider = (id: string) => {
    const provider =
      agentProviders?.find((p) => p.id === id) ?? draftProvider(id);
    if (provider) openProviderEdit(provider);
  };

  const [providerWizard, setProviderWizard] = useState<{
    position?: XYPosition;
  } | null>(null);
  const openProviderWizard = (position?: XYPosition) =>
    setProviderWizard({ position });

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
      nodes.map((n) => getPlaceholderPeer(n)).filter(Boolean) as NonNullable<
        ReturnType<typeof getPlaceholderPeer>
      >[],
    [nodes],
  );

  const draftResources = useMemo(
    () =>
      nodes.map((n) => getDraftResource(n)).filter(Boolean) as NonNullable<
        ReturnType<typeof getDraftResource>
      >[],
    [nodes],
  );

  // The policy's edges are replaced wholesale: an edit can change either side.
  const drawPolicyOnCanvas = (
    policy: Policy,
    fallbackPosition?: XYPosition,
  ) => {
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
            const n =
              findNode(sid) ?? newNodes.find((nn: any) => nn.id === sid);
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
          const owningNetwork = networks?.find(
            (n) => n.resources?.some((rid) => rid === resource.id),
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

  // A source ref that is not a live group id names a DRAFT group: the modal's
  // selector mints groups the canvas has no node for yet, so a node lookup
  // alone would read those as live ids.
  const isDraftGroupRef = (ref: string) =>
    !!groups && !groups.some((g) => g.id === ref);

  const drawAgentPolicyOnCanvas = (
    policy: AgentPolicy,
    fallbackPosition?: XYPosition,
  ) => {
    const policyNodeId = `agent-policy-${policy.id}`;
    const enabled = policy.enabled !== false;
    const isDraftPolicy = policy.id.startsWith("new-");
    const currentNodes = reactFlow.getNodes();
    const findNode = (id: string) => currentNodes.find((n) => n.id === id);

    const newNodes: any[] = [];
    const policyEdges: any[] = [];
    const base = fallbackPosition ??
      findNode(policyNodeId)?.position ?? { x: 0, y: 0 };
    let newSourceCount = 0;
    let newDestCount = 0;

    const ensureNode = (
      id: string,
      type: string,
      data: any,
      position: XYPosition,
    ) => {
      if (findNode(id) || newNodes.some((n) => n.id === id)) return false;
      newNodes.push({ id, type, data, position });
      return true;
    };

    const columnOf = (ids: string[]) =>
      ids.map((id) => findNode(id)?.position).filter(Boolean) as XYPosition[];
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

    const isGroupish = (n: { type?: string }) =>
      n.type === "groupNode" ||
      n.type === "sourceGroupNode" ||
      n.type === "destinationGroupNode";
    const findGroupNode = (ref: string) =>
      findNode(`group-${ref}`)?.id ??
      currentNodes.find(
        (n) => isGroupish(n) && (n.data as any)?.group?.id === ref,
      )?.id ??
      currentNodes.find(
        (n) =>
          isGroupish(n) &&
          !(n.data as any)?.group?.id &&
          (n.data as any)?.group?.name === ref,
      )?.id;
    const groupForRef = (ref: string): Group | undefined => {
      const onCanvas = findGroupNode(ref);
      const fromNode = onCanvas
        ? ((findNode(onCanvas)?.data as any)?.group as Group | undefined)
        : undefined;
      return fromNode ?? groups?.find((g) => g.id === ref);
    };

    const sourceColumn = columnOf(
      policy.sourceGroups
        .map((gid) => findGroupNode(gid) ?? "")
        .filter(Boolean),
    );
    const destColumn = columnOf(
      policy.destinationProviderIds.map((pid) => `provider-${pid}`),
    );

    const sourceNodeIds: string[] = [];
    for (const ref of policy.sourceGroups) {
      const isDraftRef = isDraftGroupRef(ref);
      const nodeId =
        findGroupNode(ref) ??
        (isDraftRef ? `group-new-${ref}` : `group-${ref}`);
      const group = groupForRef(ref);
      if (
        ensureNode(
          nodeId,
          "groupNode",
          {
            group:
              group ?? (isDraftRef ? { name: ref } : { id: ref, name: ref }),
            enabled,
            showHandles: true,
          },
          nextInColumn(sourceColumn, newSourceCount, base.x - 450),
        )
      ) {
        newSourceCount++;
      }
      sourceNodeIds.push(nodeId);
    }

    const destNodeIds: string[] = [];
    for (const pid of policy.destinationProviderIds) {
      const nodeId = `provider-${pid}`;
      const provider =
        agentProviders?.find((p) => p.id === pid) ?? draftProvider(pid);
      if (!provider && !findNode(nodeId)) continue;
      if (
        provider &&
        ensureNode(
          nodeId,
          "providerNode",
          {
            id: provider.id,
            providerId: provider.providerId,
            name: provider.name,
            upstreamUrl: provider.upstreamUrl,
            enabled: provider.status !== "disabled",
          },
          nextInColumn(destColumn, newDestCount, base.x + 450),
        )
      ) {
        newDestCount++;
      }
      destNodeIds.push(nodeId);
    }

    let policyPos = { x: base.x, y: base.y };
    const matched = [...sourceNodeIds, ...destNodeIds]
      .map((id) => findNode(id))
      .filter(Boolean);
    if (!fallbackPosition && !findNode(policyNodeId) && matched.length > 0) {
      const bounds = reactFlow.getNodesBounds(matched as any);
      const POLICY_NODE_HEIGHT = 36;
      const width = Math.min(248, 64 + Math.min(policy.name.length, 26) * 7);
      policyPos = {
        x: bounds.x + bounds.width / 2 - width / 2,
        y: bounds.y + bounds.height / 2 - POLICY_NODE_HEIGHT / 2,
      };
    }

    const nodeData = {
      id: policy.id,
      name: policy.name,
      enabled,
      ...(isDraftPolicy ? { policy } : {}),
    };
    if (!findNode(policyNodeId)) {
      newNodes.push({
        id: policyNodeId,
        type: "agentPolicyNode",
        data: nodeData,
        position: policyPos,
      });
    }

    policy.sourceGroups.forEach((ref, i) => {
      policyEdges.push({
        id: `agent-src-${ref}-${policy.id}`,
        source: sourceNodeIds[i],
        target: policyNodeId,
        type: "smart",
        data: { enabled },
      });
    });
    for (const pid of destNodeIds) {
      const providerId = pid.replace("provider-", "");
      const provider =
        agentProviders?.find((p) => p.id === providerId) ??
        draftProvider(providerId);
      const providerEnabled = provider ? provider.status !== "disabled" : true;
      policyEdges.push({
        id: `agent-dst-${policy.id}-${providerId}`,
        source: policyNodeId,
        target: pid,
        type: "smart",
        data: { enabled: enabled && providerEnabled },
      });
    }

    reactFlow.setNodes((prev) =>
      prev
        .map((n) =>
          n.id === policyNodeId
            ? { ...n, data: { ...n.data, ...nodeData } }
            : n,
        )
        .concat(newNodes),
    );
    reactFlow.setEdges((prev) =>
      prev
        .filter((e) => e.source !== policyNodeId && e.target !== policyNodeId)
        .concat(policyEdges),
    );
  };

  const ensureAgentDraftGroupChanges = (policy: AgentPolicy) => {
    policy.sourceGroups.forEach((ref) => {
      if (!isDraftGroupRef(ref)) return;
      const exists = changes.some(
        (c) => c.type === "create-group" && c.name === ref,
      );
      if (!exists)
        trackCreateGroup({ clientId: `group-new-${ref}`, name: ref });
    });
  };

  const updateDraftAgentPolicy = (
    policy: AgentPolicy,
    fallbackPosition?: XYPosition,
  ) => {
    if (!policy.id) return;
    ensureAgentDraftGroupChanges(policy);
    const isDraftPolicy = policy.id.startsWith("new-");
    if (isTrackableAgentPolicy(policy)) {
      const hasCreateChange = changes.some(
        (c) => c.type === "create-agent-policy" && c.clientId === policy.id,
      );
      if (isDraftPolicy && !hasCreateChange) {
        trackCreateAgentPolicy({ clientId: policy.id, policy });
      } else {
        trackUpdateAgentPolicy({
          agentPolicyId: policy.id,
          name: policy.name,
          policy,
        });
      }
    } else if (isDraftPolicy) {
      // Dropping the pending create is safe: nothing had landed yet.
      trackDeleteAgentPolicy({ agentPolicyId: policy.id, name: policy.name });
    } else {
      // An EXISTING policy stripped bare is not a deletion — deleting one has to
      // be confirmed. The pending edit survives, blocked by its Incomplete issue.
      patchPendingAgentPolicyUpdate({ agentPolicyId: policy.id, policy });
    }
    drawAgentPolicyOnCanvas(policy, fallbackPosition);
  };

  const groupNameForRef = (ref: string) =>
    groups?.find((g) => g.id === ref)?.name ??
    ((
      reactFlow.getNodes().find((n) => (n.data as any)?.group?.id === ref)
        ?.data as any
    )?.group?.name as string | undefined) ??
    ref;

  const setAgentSourceGroup = (policy: AgentPolicy, groupRef: string) => {
    const current = policy.sourceGroups[0];
    const apply = () =>
      updateDraftAgentPolicy({ ...policy, sourceGroups: [groupRef] });
    if (!current || current === groupRef) {
      apply();
      return;
    }
    void confirm({
      title: "Replace current source group?",
      description: `Are you sure you want to replace “${groupNameForRef(
        current,
      )}” with “${groupNameForRef(groupRef)}”? “${groupNameForRef(
        current,
      )}” will no longer have access to this policy's providers.`,
      confirmText: "Replace",
      cancelText: "Cancel",
      type: "warning",
    }).then((ok) => ok && apply());
  };

  const openAgentPolicyWizard = (
    prefill: { sourceGroups: string[]; destinationProviderIds: string[] },
    position?: XYPosition,
  ) => {
    const policy: AgentPolicy = {
      id: `new-${draftUid()}`,
      name: "",
      description: "",
      enabled: true,
      guardrailIds: [],
      limits: EMPTY_POLICY_LIMITS,
      ...prefill,
    };
    setAgentPolicyWizard({ policy, position });
    setSelectedAgentPolicy(policy.id);
    setAgentPolicyModalOpen(true);
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
        trackDeletePolicy({
          policyId: policy.id,
          name: policy.name ?? "Policy",
        });
        drawPolicyOnCanvas(policy);
        return;
      }
    }
    // A pending edit survives the strip, blocked by its Incomplete issue — not via
    // trackUpdatePolicy, which would read the emptied policy as a deletion.
    if (!isCompletePolicy(policy)) {
      // Functional update only: deferred strips hold a pre-removal `changes` closure,
      // and a whole-set write would resurrect what the removal untracked.
      patchPendingPolicyUpdate({ policyId: policy.id, policy });
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
      updateDraftAgentPolicy,
      setAgentSourceGroup,
      drawAgentPolicyOnCanvas,
      openAgentPolicyWizard,
      openProvider,
      openProviderWizard,
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
      agentProviders,
      groups,
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
        onOpenChange={(o) => {
          setAgentPolicyModalOpen(o);
          if (!o) setAgentPolicyWizard(null);
        }}
        policy={currentAgentPolicy}
        initial={agentPolicyWizard?.policy}
        extraProviders={isDraft ? draftProviders : undefined}
        takenNames={isDraft ? draftAgentPolicyNames : undefined}
        onBeforeSave={isDraft ? undefined : confirmLiveAgentSave}
        useSave={!isDraft}
        onDraftSubmit={(policy) => {
          const id = selectedAgentPolicy;
          if (!id) return;
          updateDraftAgentPolicy(
            { ...policy, id },
            agentPolicyWizard?.position,
          );
          setAgentPolicyWizard(null);
        }}
      />
      {editingProvider && (
        <AIProviderModal
          open={true}
          onOpenChange={(o) => {
            if (!o) closeProviderEdit();
          }}
          provider={editingProvider}
          useSave={!isDraft}
          onBeforeSave={isDraft ? undefined : confirmLiveAgentSave}
          onDraftSubmit={(input) => {
            // The modal always submits `enabled: true`; recording it here would
            // re-enable a disabled provider on deploy and override a pending
            // Disable toggle. The live edit path doesn't send it either.
            const { apiKey, enabled: _enabled, ...rest } = input;
            const updates =
              apiKey && apiKey.trim() !== MASKED_API_KEY
                ? { ...rest, apiKey }
                : rest;
            trackUpdateProvider({
              providerId: editingProvider.id,
              name: input.name,
              updates,
            });
            patchAgentNode(`provider-${editingProvider.id}`, {
              name: input.name,
              upstreamUrl: input.upstreamUrl,
            });
          }}
        />
      )}
      {providerWizard && (
        <AIProviderModal
          open={true}
          takenNames={isDraft ? draftProviderNames : undefined}
          onOpenChange={(o) => {
            if (!o) setProviderWizard(null);
          }}
          useSave={!isDraft}
          onBeforeSave={isDraft ? undefined : confirmLiveAgentSave}
          onDraftSubmit={(input) => {
            const clientId = `new-${draftUid()}`;
            trackCreateProvider({ clientId, name: input.name, input });
            placeProviderNode(
              {
                id: clientId,
                providerId: input.providerId,
                name: input.name,
                upstreamUrl: input.upstreamUrl,
                enabled: true,
              },
              providerWizard.position,
            );
            setProviderWizard(null);
          }}
        />
      )}
      {children}
    </PolicyContext.Provider>
  );
}
