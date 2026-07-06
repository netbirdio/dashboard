"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import {
  AccessControlModalContent,
  AccessControlUpdateModal,
} from "@/modules/access-control/AccessControlModal";
import { Modal } from "@components/modal/Modal";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import { Group } from "@/interfaces/Group";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useReactFlow } from "@xyflow/react";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";

interface PolicyContextType {
  // Edit existing policy
  selectedPolicy: string;
  setSelectedPolicy: (id: string) => void;
  policyModalOpen: boolean;
  setPolicyModalOpen: (open: boolean) => void;
  currentPolicy: Policy | undefined;
  handlePolicyChange: () => void;
  // Create new policy (draft connect)
  createPolicyModal: boolean;
  setCreatePolicyModal: (open: boolean) => void;
  policySourceResource: PolicyRuleResource | undefined;
  setPolicySourceResource: (r: PolicyRuleResource | undefined) => void;
  policyDestinationResource: PolicyRuleResource | undefined;
  setPolicyDestinationResource: (r: PolicyRuleResource | undefined) => void;
  policySourceGroups: Group[];
  setPolicySourceGroups: (g: Group[]) => void;
  policyDestinationGroups: Group[];
  setPolicyDestinationGroups: (g: Group[]) => void;
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
  const { policies, peers, networkResources } = useControlCenterData();
  const { nodes, edges, setLayoutInitialized } = useCanvasState();
  const { isDraft } = useDraftMode();
  const reactFlow = useReactFlow();

  const [selectedPolicy, setSelectedPolicy] = useState("");
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [createPolicyModal, setCreatePolicyModal] = useState(false);
  const [policySourceResource, setPolicySourceResource] =
    useState<PolicyRuleResource>();
  const [policyDestinationResource, setPolicyDestinationResource] =
    useState<PolicyRuleResource>();
  const [policySourceGroups, setPolicySourceGroups] = useState<Group[]>([]);
  const [policyDestinationGroups, setPolicyDestinationGroups] = useState<
    Group[]
  >([]);

  const currentPolicy = useMemo(
    () => policies?.find((p) => p.id === selectedPolicy),
    [policies, selectedPolicy],
  );

  const handlePolicyChange = () => {
    setTimeout(() => {
      setLayoutInitialized(false);
      setSelectedPolicy("");
      setPolicyModalOpen(false);
    }, 500);
  };

  const addPolicyEdge = (policy: Policy) => {
    setCreatePolicyModal(false);
    setPolicySourceResource(undefined);
    setPolicyDestinationResource(undefined);
    setPolicySourceGroups([]);
    setPolicyDestinationGroups([]);

    const rule = policy?.rules?.[0];
    if (!rule) return;

    const enabled = policy?.enabled;
    const edgeType = isDraft ? "smart" : "in";
    const policyNodeId = `policy-${policy.id}`;

    const currentNodes = reactFlow.getNodes();
    const currentEdges = reactFlow.getEdges();
    const findNode = (id: string) => currentNodes.find((n) => n.id === id);

    const newNodes: any[] = [];
    const newEdges: any[] = [];

    // Helper: ensure a node exists on canvas, create if missing
    const ensureNode = (id: string, type: string, data: any) => {
      if (!findNode(id) && !newNodes.some((n) => n.id === id)) {
        newNodes.push({
          id,
          type,
          data,
          position: { x: 0, y: 0 },
        });
      }
    };

    const ensureEdge = (id: string, source: string, target: string) => {
      if (
        !currentEdges.some((e) => e.id === id) &&
        !newEdges.some((e) => e.id === id)
      ) {
        newEdges.push({
          id,
          source,
          target,
          type: edgeType,
          data: { enabled, policy },
        });
      }
    };

    // Detect self-referencing groups
    const sourceGroupIds = new Set(
      ((rule.sources as Group[]) ?? [])
        .map((g) => (typeof g === "string" ? g : g.id))
        .filter(Boolean),
    );
    const destGroupIds = new Set(
      ((rule.destinations as Group[]) ?? [])
        .map((g) => (typeof g === "string" ? g : g.id))
        .filter(Boolean),
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

    // --- Source nodes ---
    const sourceNodeIds: string[] = [];

    // Source groups
    for (const source of (rule.sources as Group[]) ?? []) {
      const gid = typeof source === "string" ? source : source.id;
      if (!gid) continue;
      const group = typeof source === "string" ? undefined : source;
      const existingNodeId = findGroupNode(gid, group?.name);
      const nodeId = existingNodeId ?? `group-${gid}`;
      ensureNode(nodeId, "groupNode", {
        group: group ?? { id: gid, name: gid },
        enabled,
        showHandles: true,
      });
      sourceNodeIds.push(nodeId);
    }

    // Source resource (peer)
    const sourceResource = rule.sourceResource;
    if (sourceResource?.id && sourceResource.type === "peer") {
      const peer = peers?.find((p) => p.id === sourceResource.id);
      if (peer) {
        const nodeId = `peer-${peer.id}`;
        ensureNode(nodeId, "peerNode", {
          peer,
          enabled: true,
          showHandles: true,
          variant: "card",
        });
        sourceNodeIds.push(nodeId);
      }
    }

    // --- Destination nodes ---
    const destNodeIds: string[] = [];

    // Destination groups
    for (const dest of (rule.destinations as Group[]) ?? []) {
      const gid = typeof dest === "string" ? dest : dest.id;
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
        nodeId = existingDestNode ?? `group-${gid}`;
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

      ensureNode(nodeId, "destinationGroupNode", {
        group: group ?? { id: gid, name: gid },
        enabled,
        showHandles: true,
      });
      destNodeIds.push(nodeId);
    }

    // Destination resource
    const destResource = rule.destinationResource;
    if (destResource?.id) {
      if (destResource.type === "peer") {
        const peer = peers?.find((p) => p.id === destResource.id);
        if (peer) {
          const nodeId = `peer-${peer.id}`;
          ensureNode(nodeId, "peerNode", {
            peer,
            enabled: true,
            showHandles: true,
            variant: "card",
          });
          destNodeIds.push(nodeId);
        }
      } else {
        const resource = networkResources?.find(
          (r) => r.id === destResource.id,
        );
        if (resource) {
          const nodeId = `resource-${resource.id}`;
          ensureNode(nodeId, "resourceNode", { resource, enabled });
          destNodeIds.push(nodeId);
        }
      }
    }

    // --- Position policy node between sources and destinations ---
    const allExistingNodes = [...sourceNodeIds, ...destNodeIds]
      .map((id) => findNode(id))
      .filter(Boolean);

    let centerX = 0;
    let centerY = 0;
    if (allExistingNodes.length > 0) {
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
      ensureEdge(`${sourceId}-${policyNodeId}`, sourceId, policyNodeId);
    }
    for (const destId of destNodeIds) {
      ensureEdge(`${policyNodeId}-${destId}`, policyNodeId, destId);
    }

    if (newNodes.length > 0) reactFlow.addNodes(newNodes);
    if (newEdges.length > 0) reactFlow.addEdges(newEdges);
  };

  const value = useMemo(
    () => ({
      selectedPolicy,
      setSelectedPolicy,
      policyModalOpen,
      setPolicyModalOpen,
      currentPolicy,
      handlePolicyChange,
      createPolicyModal,
      setCreatePolicyModal,
      policySourceResource,
      setPolicySourceResource,
      policyDestinationResource,
      setPolicyDestinationResource,
      policySourceGroups,
      setPolicySourceGroups,
      policyDestinationGroups,
      setPolicyDestinationGroups,
    }),
    [
      selectedPolicy,
      policyModalOpen,
      currentPolicy,
      createPolicyModal,
      policySourceResource,
      policyDestinationResource,
      policySourceGroups,
      policyDestinationGroups,
    ],
  );

  return (
    <PolicyContext.Provider value={value}>
      {currentPolicy && (
        <AccessControlUpdateModal
          policy={currentPolicy}
          open={policyModalOpen}
          onSuccess={handlePolicyChange}
          onOpenChange={setPolicyModalOpen}
        />
      )}
      {createPolicyModal && (
        <Modal open={createPolicyModal} onOpenChange={setCreatePolicyModal}>
          <AccessControlModalContent
            key={createPolicyModal ? 1 : 0}
            onSuccess={addPolicyEdge}
            initialSourceResource={policySourceResource}
            initialDestinationResource={policyDestinationResource}
            initialSourceGroups={policySourceGroups}
            initialDestinationGroups={policyDestinationGroups}
          />
        </Modal>
      )}
      {children}
    </PolicyContext.Provider>
  );
}
