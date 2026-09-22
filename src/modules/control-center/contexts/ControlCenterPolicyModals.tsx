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
import AIProviderModal from "@/modules/agent-network/AIProviderModal";
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
  // Records the policy and redraws its group → policy → provider edges.
  updateDraftAgentPolicy: (policy: AgentPolicy) => void;
  // Puts a group on the policy's source side, asking first when that means
  // displacing the one already there.
  setAgentSourceGroup: (policy: AgentPolicy, groupRef: string) => void;
  // Redraw only, for restoring a policy a discarded change had stripped.
  drawAgentPolicyOnCanvas: (policy: AgentPolicy) => void;
  // Create flows. A position places the node where the drop landed.
  openProviderWizard: (position?: XYPosition) => void;
  // A connect drawn between a group and a provider: the modal opens on a
  // policy that exists nowhere yet, and the node lands on save.
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
  } = useDraftChangeset();
  const { placeProviderNode, placeAgentPolicyNode } = useDraftNodeCreation();
  const { setDropdownOptions } = useGroups();
  const reactFlow = useReactFlow();
  const { confirm } = useDialog();

  // Keeps a canvas node in step with an edit the changeset just recorded.
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

  // Agent-network records have no draft representation: they are not in the
  // changeset and a save writes to the account whichever mode the canvas is
  // in, so this one confirms in draft too — saying why.
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
  // A policy the user drew by connecting two nodes: it has no node and no API
  // record until the modal saves, so the prefill stands in for both.
  const [agentPolicyWizard, setAgentPolicyWizard] = useState<{
    policy: AgentPolicy;
    position?: XYPosition;
  } | null>(null);

  const currentAgentPolicy = useMemo(() => {
    if (!selectedAgentPolicy) return undefined;
    // A draft policy has no API record; its node carries the whole thing, and
    // its create change is the fallback when the node is gone.
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
    // An existing policy's draft edits live in the changeset, not on its node
    // (which mirrors live) — without this the modal reopens on stale sides.
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

  // The rule access-control policies follow: a policy enters the changeset
  // once it authorizes something, and leaves it again if emptied.
  const isTrackableAgentPolicy = (policy: {
    sourceGroups: string[];
    destinationProviderIds: string[];
  }) =>
    policy.sourceGroups.length > 0 && policy.destinationProviderIds.length > 0;
  const openAgentPolicy = (id: string) => {
    setSelectedAgentPolicy(id);
    setAgentPolicyModalOpen(true);
  };
  // Providers the draft created have no API record yet — the create changes
  // they are going to deploy as hold everything the modals need.
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

  // Agent policy names the account list can't know about: the draft's own.
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

  // The provider modal is driven from AIProvidersProvider, so the canvas and
  // the providers table open the same one.
  const openProvider = (id: string) => {
    const provider =
      agentProviders?.find((p) => p.id === id) ?? draftProvider(id);
    if (provider) openProviderEdit(provider);
  };

  // A provider can't exist until its URL and credential are typed, so the
  // create opens the modal and the node lands on save. The drop position is
  // held so the node appears where the user let go.
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

  // The agent-network mirror of drawPolicyOnCanvas: source groups on the left,
  // the policy pill in the middle, providers on the right. Ids match the live
  // overlay's, so a draft drawn here and a live view of the same policy carry
  // the same nodes and edges.
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

    // New nodes join the column their side already occupies, so they land
    // where Auto Arrange would put them rather than on the anchor.
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

    // A source entry is a live group's id or a draft group's NAME, and a group
    // already on the canvas is reused whatever role its node plays.
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
      const nodeId = findGroupNode(ref) ?? `group-${ref}`;
      const group = groupForRef(ref);
      if (
        ensureNode(
          nodeId,
          "groupNode",
          {
            group: group ?? { id: ref, name: ref },
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

    // An explicit drop position wins; otherwise center on what it connects.
    let policyPos = { x: base.x, y: base.y };
    const matched = [...sourceNodeIds, ...destNodeIds]
      .map((id) => findNode(id))
      .filter(Boolean);
    if (!fallbackPosition && !findNode(policyNodeId) && matched.length > 0) {
      const bounds = reactFlow.getNodesBounds(matched as any);
      // The pill has no fixed width; estimate it from the name, as the
      // access-control policy node does.
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
      // Draft policies have no API record to read back, so the node carries
      // the whole thing for the editor and the changeset.
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

    for (const ref of policy.sourceGroups) {
      const sourceId = findGroupNode(ref) ?? `group-${ref}`;
      policyEdges.push({
        id: `agent-src-${ref}-${policy.id}`,
        source: sourceId,
        target: policyNodeId,
        type: "smart",
        data: { enabled },
      });
    }
    for (const pid of destNodeIds) {
      policyEdges.push({
        id: `agent-dst-${policy.id}-${pid.replace("provider-", "")}`,
        source: policyNodeId,
        target: pid,
        type: "smart",
        data: { enabled },
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

  // The agent-network twin of updateDraftPolicy: record what the policy now
  // is, then redraw it. A policy that authorizes nothing is a canvas-only
  // sketch, so its pending create is dropped again.
  // The agent twin of ensureDraftGroupChanges: a policy naming a group the
  // draft invented only deploys if that group is created first.
  const ensureAgentDraftGroupChanges = (policy: AgentPolicy) => {
    policy.sourceGroups.forEach((ref) => {
      // A ref naming an id-less canvas group is a draft group; a live group's
      // id matches no group's name, so an id ref falls through.
      const isDraftGroup = reactFlow
        .getNodes()
        .some(
          (n) =>
            !(n.data as any)?.group?.id && (n.data as any)?.group?.name === ref,
        );
      if (!isDraftGroup) return;
      const exists = changes.some(
        (c) => c.type === "create-group" && c.name === ref,
      );
      // Same clientId shape as the access-control path, so a group both name
      // produces one create-group change, not two.
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
        // Folds into the pending create when there is one.
        trackUpdateAgentPolicy({
          agentPolicyId: policy.id,
          name: policy.name,
          policy,
        });
      }
    } else {
      // Authorizing nothing is not an update the API accepts: a draft policy
      // goes back to being a canvas-only sketch (the tracker drops its pending
      // create), an existing one deploys as a deletion.
      trackDeleteAgentPolicy({ agentPolicyId: policy.id, name: policy.name });
    }
    drawAgentPolicyOnCanvas(policy, fallbackPosition);
  };

  // A ref is a live group's id or a draft group's name; both resolve to
  // something the user recognizes.
  const groupNameForRef = (ref: string) =>
    groups?.find((g) => g.id === ref)?.name ??
    ((
      reactFlow.getNodes().find((n) => (n.data as any)?.group?.id === ref)
        ?.data as any
    )?.group?.name as string | undefined) ??
    ref;

  // An agent policy authorizes exactly one group, so a second one REPLACES the
  // first — a quiet swap of who may reach the provider, which is worth asking
  // about.
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
      {/* Agent-network writes go straight to the account too, so live saves
          confirm the same way a policy's do. */}
      <AgentPolicyModal
        open={agentPolicyModalOpen}
        onOpenChange={(o) => {
          setAgentPolicyModalOpen(o);
          // A cancelled connect leaves nothing behind: the policy it would
          // have created exists only as this prefill.
          if (!o) setAgentPolicyWizard(null);
        }}
        policy={currentAgentPolicy}
        // A connect prefills a policy that does not exist yet, so it seeds the
        // form without turning the save into an update.
        initial={agentPolicyWizard?.policy}
        extraProviders={isDraft ? draftProviders : undefined}
        takenNames={isDraft ? draftAgentPolicyNames : undefined}
        onBeforeSave={isDraft ? undefined : confirmLiveAgentSave}
        useSave={!isDraft}
        onDraftSubmit={(policy) => {
          const id = selectedAgentPolicy;
          if (!id) return;
          // Redraws the edges too: the modal is where a policy's groups and
          // providers change, and the canvas has to follow.
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
          // In draft the edit is a change, not a request; live confirms first.
          useSave={!isDraft}
          onBeforeSave={isDraft ? undefined : confirmLiveAgentSave}
          onDraftSubmit={(input) => {
            trackUpdateProvider({
              providerId: editingProvider.id,
              name: input.name,
              updates: input,
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
          // Providers pending in the changeset aren't in the account list, so
          // the catalog default would collide with one unseen.
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
