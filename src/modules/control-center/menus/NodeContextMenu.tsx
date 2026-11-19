import { Modal } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { Node } from "@xyflow/react";
import {
  CircleMinusIcon,
  EyeIcon,
  FocusIcon,
  PencilLineIcon,
  PowerIcon,
  PowerOffIcon,
  Share2Icon,
  SquarePenIcon,
  TrashIcon,
  WorkflowIcon,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { mutate } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { usePolicies } from "@/contexts/PoliciesProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Group, GroupIssued } from "@/interfaces/Group";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import { useAIProviders } from "@/modules/agent-network/AIProvidersProvider";
import {
  useCanvasState,
  useControlCenterUI,
  useDestinationGroup,
} from "@/modules/control-center/contexts/ControlCenterContext";
import { useControlCenterPolicy } from "@/modules/control-center/contexts/ControlCenterPolicyModals";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { GroupRenameModal } from "@/modules/control-center/draft/modals/GroupRenameModal";
import { useCanDeleteGroup } from "@/modules/control-center/hooks/useCanDeleteGroup";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useDeleteNetwork } from "@/modules/control-center/hooks/useDeleteNetwork";
import {
  canRenameGroup,
  getNodeGroup,
  isAllGroup,
  isGroupNode,
  isNewGroup,
  useDraftGroupActions,
} from "@/modules/control-center/hooks/useDraftGroupActions";
import { useDraftNetworkActions } from "@/modules/control-center/hooks/useDraftNetworkActions";
import { useDraftNodeCreation } from "@/modules/control-center/hooks/useDraftNodeCreation";
import { useEdgeAwareMenuPosition } from "@/modules/control-center/hooks/useEdgeAwareMenuPosition";
import { useNodeRemoval } from "@/modules/control-center/hooks/useNodeRemoval";
import { menuItemSlug } from "@/modules/control-center/menus/menuItemTestId";
import { getNodeRect } from "@/modules/control-center/utils/canvas-transition";
import {
  DraftNetworkRef,
  getPlaceholderPeer,
  getResourceDraftGroupIds,
  getResourceLiveBaseline,
  getResourceNodeEnabled,
  isDraftNetworkNode,
  isFocusWorthy,
  isFrameNode,
  PLACEHOLDER_BASE_NAMES,
} from "@/modules/control-center/utils/helpers";
import { canRenamePeerNode } from "@/modules/control-center/utils/node-capabilities";
import { EditPeerNameModal } from "@/modules/peers/EditPeerNameModal";

type MenuPosition = {
  x: number;
  y: number;
};

type MenuItem = {
  testLabel: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
};

interface NodeContextMenuProps {
  position: MenuPosition | null;
  nodeId: string;
  // Closes just the menu, keeping any panel it opened.
  onClose: () => void;
  onDismiss: () => void;
}

export const NodeContextMenu = ({
  position,
  nodeId,
  onClose,
  onDismiss,
}: NodeContextMenuProps) => {
  const t = useTranslations();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuPosition = useEdgeAwareMenuPosition(position, menuRef);
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    setSelectedDestinationGroup,
    refreshLiveViewRef,
    setLiveResourceEditor,
  } = useCanvasState();
  const { focusedNodeId, setFocusedNodeId, setSelectedPeerPanel } =
    useDestinationGroup();
  const { updatePolicy, serializeRules, deletePolicy } = usePolicies();
  const groupRequest = useApiCall<Group>("/groups", true);
  const peerRequest = useApiCall<Peer>("/peers", true);
  const resourceRequest = useApiCall<NetworkResource>("/networks", true);
  const { permission } = usePermissions();
  const {
    isDraft,
    setResourceEditor,
    setRoutingPeerModal,
    setNetworkEditor,
    setDrillDownNetworkNodeId,
  } = useDraftMode();
  const { onNetworkSelect } = useControlCenterUI();
  const {
    setSelectedPolicy,
    setPolicyModalOpen,
    openProvider,
    openAgentPolicy,
  } = useControlCenterPolicy();
  const {
    toggleProvider,
    deleteProvider: deleteAgentProvider,
    togglePolicy: toggleAgentPolicy,
    deletePolicy: deleteAgentPolicy,
  } = useAIProviders();
  const { groups, policies } = useControlCenterData();
  const { canDeleteGroup } = useCanDeleteGroup();
  const {
    changes,
    trackSetPolicyEnabled,
    trackDeletePolicy,
    trackUpdateResource,
    trackDeleteResource,
    trackInstallPeer,
    trackUpdateProvider,
    trackDeleteProvider,
    trackUpdateAgentPolicy,
    trackDeleteAgentPolicy,
  } = useDraftChangeset();
  const { confirm } = useDialog();
  const {
    renameGroup,
    removeGroup,
    confirmAndDeleteGroups,
    removeNodeWithEdges,
  } = useDraftGroupActions();
  const { addResourceGroupToFrame } = useDraftNodeCreation();
  const { syncDraftResource } = useDraftNetworkActions();
  const deleteNetwork = useDeleteNetwork();

  // The rename target outlives both the menu closing (position → null) and the
  // modal's close animation; clearing it early flips the title back mid-fade.
  const [renameTarget, setRenameTarget] = useState<Node | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const openRename = useCallback((target: Node) => {
    setRenameTarget(target);
    setRenameOpen(true);
  }, []);
  const isPlaceholderRename = !!renameTarget?.data?.placeholderKind;
  const placeholderCurrentName =
    (renameTarget?.data?.placeholderName as string) ||
    PLACEHOLDER_BASE_NAMES[renameTarget?.data?.placeholderKind as string] ||
    t("common.peer");
  const isResourceRename = !!renameTarget?.id.startsWith("resource-new-");
  const resourceCurrentName =
    (renameTarget?.data?.resource as { name?: string } | undefined)?.name ?? "";
  // Draft resource names must stay unique across the other draft resources.
  const resourceTakenNames = useMemo(
    () =>
      nodes
        .filter(
          (n) => n.id.startsWith("resource-new-") && n.id !== renameTarget?.id,
        )
        .map((n) => (n.data?.resource as { name?: string } | undefined)?.name)
        .filter(Boolean) as string[],
    [nodes, renameTarget],
  );

  // Placeholder names must stay unique across the draft peers on the canvas.
  const placeholderTakenNames = useMemo(
    () =>
      nodes
        .filter((n) => n.id !== renameTarget?.id)
        .map((n) => getPlaceholderPeer(n)?.name)
        .filter(Boolean) as string[],
    [nodes, renameTarget],
  );

  // Group names must be unique across API and draft groups (name-based matching
  // becomes ambiguous otherwise); "All" is reserved for the system group.
  const groupTakenNames = useMemo(() => {
    const currentGroup = getNodeGroup(renameTarget ?? undefined);
    const names = new Set<string>(["All"]);
    groups?.forEach((g) => names.add(g.name));
    nodes.forEach((n) => {
      const g = getNodeGroup(n);
      if (g?.name && g.name !== currentGroup?.name) names.add(g.name);
    });
    names.delete(currentGroup?.name ?? "");
    return Array.from(names);
  }, [groups, nodes, renameTarget]);

  // Placeholder names live only on the canvas node; an installed peer takes its
  // name from the machine.
  const renamePlaceholder = useCallback(
    (id: string, name: string) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, placeholderName: name } }
            : n,
        ),
      );
      const kind = nodes.find((n) => n.id === id)?.data?.placeholderKind as
        | "user-device"
        | "server"
        | "agent"
        | undefined;
      if (kind) {
        trackInstallPeer({ clientId: id.replace("peer-", ""), name, kind });
      }
    },
    [setNodes, nodes, trackInstallPeer],
  );

  const renameResource = useCallback(
    (id: string, name: string) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  resource: {
                    ...(n.data.resource as object),
                    name,
                  },
                },
              }
            : n,
        ),
      );
      setTimeout(() => syncDraftResource(id), 0);
    },
    [setNodes, syncDraftResource],
  );

  const toggleResourceEnabled = useCallback(
    (id: string) => {
      const target = nodes.find((n) => n.id === id);
      const enabled = !getResourceNodeEnabled(target);
      const isDraftResource = id.startsWith("resource-new-");
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                // A draft resource has no live twin, so there the flag IS the
                // state; an existing one needs its own key to stay separable.
                data: isDraftResource
                  ? { ...n.data, enabled }
                  : { ...n.data, resourceEnabled: enabled },
              }
            : n,
        ),
      );
      // Draft resources carry their enabled state via their create-resource
      // change, so they only need a re-sync after the canvas update.
      if (isDraftResource) {
        setTimeout(() => syncDraftResource(id), 0);
        return;
      }
      const resource = (target?.data as { resource?: NetworkResource })
        ?.resource;
      const net = (target?.data as { draftNetwork?: DraftNetworkRef })
        ?.draftNetwork;
      if (resource?.id && net?.networkId) {
        // trackUpdateResource replaces the pending change wholesale, so this must
        // carry the CURRENT groups; the live ones would revert a pending edit.
        const groupIds = getResourceDraftGroupIds(target);
        const live = getResourceLiveBaseline(target);
        const originalGroupIds = (
          (live?.groups as (string | { id?: string })[]) ?? []
        )
          .map((g) => (typeof g === "string" ? g : g.id ?? ""))
          .filter(Boolean);
        trackUpdateResource({
          resourceId: resource.id,
          networkId: net.networkId,
          name: resource.name,
          networkName: net.name,
          address: resource.address,
          description: resource.description,
          enabled,
          groupIds,
          // Live state, so toggling back to it drops the change. Not `resource`:
          // that already holds any earlier name/address edit.
          original: {
            enabled: live?.enabled ?? true,
            name: live?.name ?? resource.name,
            address: live?.address ?? resource.address,
            description: live?.description,
            groupIds: originalGroupIds,
          },
        });
      }
    },
    [nodes, setNodes, trackUpdateResource, syncDraftResource],
  );

  const deleteResource = useCallback(
    async (id: string) => {
      const target = nodes.find((n) => n.id === id);
      const resourceName =
        (target?.data as { resource?: NetworkResource })?.resource?.name ??
        t("common.resource");
      const choice = await confirm({
        title: t("controlCenter.deleteResource", {
          resourceName: resourceName,
        }),
        description: t("controlCenter.itWillBeMarkedForDeletionAndDeleted"),
        confirmText: t("common.delete"),
        cancelText: t("common.cancel"),
        type: "danger",
        dismissOnOutsideClick: true,
      });
      if (!choice) return;
      const resource = (target?.data as { resource?: NetworkResource })
        ?.resource;
      const net = (target?.data as { draftNetwork?: DraftNetworkRef })
        ?.draftNetwork;
      if (resource?.id && net?.networkId) {
        trackDeleteResource({
          resourceId: resource.id,
          networkId: net.networkId,
          name: resource.name,
          networkName: net.name,
        });
      }
      removeNodeWithEdges(id);
    },
    [t, nodes, confirm, trackDeleteResource, removeNodeWithEdges],
  );

  const node = useMemo(
    () => nodes.find((n) => n.id === nodeId),
    [nodes, nodeId],
  );

  const handleRemove = useCallback(() => {
    removeNodeWithEdges(nodeId);
  }, [nodeId, removeNodeWithEdges]);

  const nodePolicy = node?.data?.policy as Policy | undefined;
  const policyClientId = nodeId.startsWith("policy-")
    ? nodeId.replace("policy-", "")
    : "";
  const policyEnabled = nodePolicy?.rules?.[0]?.enabled ?? nodePolicy?.enabled;
  // A deletion-emptied policy keeps its node, so Disable stays reachable — and
  // trackSetPolicyEnabled refuses it. The item goes rather than flipping the canvas alone.
  const policyMarkedForDeletion =
    !!policyClientId &&
    changes.some(
      (c) => c.type === "delete-policy" && c.policyId === policyClientId,
    );

  const handleTogglePolicy = useCallback(() => {
    if (!nodePolicy) return;
    const enabled = !policyEnabled;
    const originalEnabled =
      policies?.find((p) => p.id === nodePolicy.id)?.enabled ?? !enabled;

    trackSetPolicyEnabled({
      policyId: policyClientId,
      name: nodePolicy.name ?? t("common.policy"),
      enabled,
      originalEnabled,
      policy: nodePolicy,
    });

    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        const policy = n.data.policy as Policy;
        return {
          ...n,
          data: {
            ...n.data,
            policy: {
              ...policy,
              enabled,
              rules: policy.rules?.map((r) => ({ ...r, enabled })),
            },
          },
        };
      }),
    );
    setEdges((prev) =>
      prev.map((e) =>
        e.source === nodeId || e.target === nodeId
          ? { ...e, data: { ...e.data, enabled } }
          : e,
      ),
    );
  }, [
    t,
    nodePolicy,
    policyEnabled,
    policies,
    policyClientId,
    nodeId,
    trackSetPolicyEnabled,
    setNodes,
    setEdges,
  ]);

  const { removePolicyFromCanvas } = useNodeRemoval();
  const handleRemovePolicyFromCanvas = useCallback(() => {
    if (node) removePolicyFromCanvas(node);
  }, [node, removePolicyFromCanvas]);

  const handleDeletePolicy = useCallback(async () => {
    if (!nodePolicy) return;
    const choice = await confirm({
      title: t("controlCenter.deletePolicy", {
        nodePolicy_Policy: nodePolicy.name ?? t("common.policy"),
      }),
      description: t("controlCenter.itWillBeMarkedForDeletionAndDeleted"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      type: "danger",
      dismissOnOutsideClick: true,
    });
    if (!choice) return;
    trackDeletePolicy({
      policyId: policyClientId,
      name: nodePolicy.name ?? t("common.policy"),
    });
    removeNodeWithEdges(nodeId);
  }, [
    t,
    nodePolicy,
    policyClientId,
    nodeId,
    confirm,
    trackDeletePolicy,
    removeNodeWithEdges,
  ]);

  // The canvas node's policy may predate the last save; the SWR list is fresher.
  const livePolicy = useMemo(
    () =>
      (nodePolicy?.id && policies?.find((p) => p.id === nodePolicy.id)) ||
      nodePolicy,
    [policies, nodePolicy],
  );

  // The "you are in live mode" confirmation is deferred to the modal's Save.
  const handleLiveEditPolicy = useCallback(() => {
    if (!livePolicy?.id) return;
    setSelectedPolicy(livePolicy.id);
    setPolicyModalOpen(true);
  }, [livePolicy, setSelectedPolicy, setPolicyModalOpen]);

  const handleViewNetworkDetails = useCallback(
    (frameNode: Node) => {
      if (isDraft) {
        setDrillDownNetworkNodeId(frameNode.id);
      } else {
        onNetworkSelect(
          frameNode.id.replace("network-", ""),
          getNodeRect(frameNode),
        );
      }
    },
    [isDraft, setDrillDownNetworkNodeId, onNetworkSelect],
  );

  const handleLiveTogglePolicy = useCallback(async () => {
    if (!livePolicy?.id) return;
    const enabled = !(livePolicy.enabled ?? true);
    const choice = await confirm({
      title: t("controlCenter.togglePolicyTitle", {
        enabled: enabled ? "true" : "false",
        livePolicy_Policy: livePolicy.name ?? t("common.policy"),
      }),
      description: t("controlCenter.youAreInLiveModeThePolicyWill", {
        enabled: enabled ? "true" : "false",
      }),
      confirmText: enabled ? t("common.enable") : t("common.disable"),
      cancelText: t("common.cancel"),
      type: "warning",
      dismissOnOutsideClick: true,
    });
    if (!choice) return;
    updatePolicy(
      livePolicy,
      { enabled, rules: serializeRules(livePolicy.rules, enabled) },
      (p) => {
        mutate("/policies");
        refreshLiveViewRef.current(p);
      },
      enabled
        ? t("controlCenter.thePolicyWasSuccessfullyEnabled")
        : t("controlCenter.thePolicyWasSuccessfullyDisabled"),
    );
  }, [
    t,
    livePolicy,
    confirm,
    updatePolicy,
    serializeRules,
    refreshLiveViewRef,
  ]);

  const liveResourceOf = useCallback((n: Node) => {
    const resource = (n.data as { resource?: NetworkResource })?.resource;
    const networkId =
      (n.data as { draftNetwork?: { networkId?: string } })?.draftNetwork
        ?.networkId ?? n.parentId?.replace("network-", "");
    return resource?.id && networkId ? { resource, networkId } : null;
  }, []);

  const handleLiveEditResource = useCallback(
    async (n: Node) => {
      const ref = liveResourceOf(n);
      if (!ref) return;
      const choice = await confirm({
        title: t("controlCenter.editResource", {
          resource_Resource: ref.resource.name ?? t("common.resource"),
        }),
        description: t("controlCenter.youAreInLiveModeSavingYourChanges"),
        confirmText: t("common.edit"),
        cancelText: t("common.cancel"),
        type: "warning",
        dismissOnOutsideClick: true,
      });
      if (!choice) return;
      setLiveResourceEditor({
        resourceId: ref.resource.id!,
        networkId: ref.networkId,
      });
    },
    [t, liveResourceOf, confirm, setLiveResourceEditor],
  );

  const handleLiveToggleResource = useCallback(
    async (n: Node) => {
      const ref = liveResourceOf(n);
      if (!ref) return;
      const enabled = !(ref.resource.enabled ?? true);
      const choice = await confirm({
        title: t("controlCenter.toggleResourceTitle", {
          enabled: enabled ? "true" : "false",
          resource_Resource: ref.resource.name ?? t("common.resource"),
        }),
        description: t("controlCenter.youAreInLiveModeTheResourceWill", {
          enabled: enabled ? "true" : "false",
        }),
        confirmText: enabled ? t("common.enable") : t("common.disable"),
        cancelText: t("common.cancel"),
        type: "warning",
        dismissOnOutsideClick: true,
      });
      if (!choice) return;
      const toIds = (list?: (string | { id?: string })[]) =>
        (list ?? []).map((x) => (typeof x === "string" ? x : x.id ?? ""));
      const updated = await resourceRequest.put(
        {
          name: ref.resource.name,
          description: ref.resource.description ?? "",
          address: ref.resource.address,
          groups: toIds(ref.resource.groups as (string | { id?: string })[]),
          enabled,
        },
        `/${ref.networkId}/resources/${ref.resource.id}`,
      );
      setNodes((prev) =>
        prev.map((node) => {
          const res = node.data?.resource as { id?: string } | undefined;
          if (!res || res.id !== ref.resource.id) return node;
          return {
            ...node,
            data: {
              ...node.data,
              resource: updated ?? { ...ref.resource, enabled },
              enabled,
            },
          };
        }),
      );
      await mutate("/networks/resources");
    },
    [t, liveResourceOf, confirm, resourceRequest, setNodes],
  );

  const focusItems = useCallback(
    (n: Node): MenuItem[] => {
      if (focusedNodeId === n.id) return [];
      if (!isFocusWorthy(n.id, nodes, edges)) return [];
      return [
        {
          testLabel: "Focus",
          label: t("controlCenter.focus"),
          icon: <FocusIcon size={14} />,
          onClick: () => setFocusedNodeId(n.id),
        },
      ];
    },
    [t, nodes, edges, focusedNodeId, setFocusedNodeId],
  );

  const isAgentNode = useCallback(
    (n: Node) => n.type === "providerNode" || n.type === "agentPolicyNode",
    [],
  );

  const agentItems = useCallback(
    (n: Node): MenuItem[] => {
      const isProvider = n.type === "providerNode";
      const data = n.data as { id?: string; name?: string; enabled?: boolean };
      const recordId = data?.id;
      if (!recordId) return [];
      const isNew = recordId.startsWith("new-");
      const permKey = isProvider
        ? "agent_network.providers"
        : "agent_network.policies";
      const mayWrite = isNew
        ? !!permission?.[permKey]?.create
        : !!permission?.[permKey]?.update;
      const mayDelete = !!permission?.[permKey]?.delete;
      const enabled = data?.enabled !== false;
      const label =
        data?.name ??
        (isProvider ? t("common.provider") : t("controlCenter.agentPolicy"));

      const items: MenuItem[] = [];
      if (mayWrite) {
        items.push({
          testLabel: "Edit",
          label: t("common.edit"),
          icon: <SquarePenIcon size={14} />,
          onClick: () =>
            isProvider ? openProvider(recordId) : openAgentPolicy(recordId),
        });
        items.push({
          testLabel: enabled ? "Disable" : "Enable",
          label: enabled ? t("common.disable") : t("common.enable"),
          icon: enabled ? <PowerOffIcon size={14} /> : <PowerIcon size={14} />,
          onClick: () => {
            const syncEdges = () =>
              setEdges((prev) =>
                prev.map((e) =>
                  e.source === n.id || e.target === n.id
                    ? { ...e, data: { ...e.data, enabled: !enabled } }
                    : e,
                ),
              );
            const syncNode = () =>
              setNodes((prev) =>
                prev.map((x) =>
                  x.id === n.id
                    ? { ...x, data: { ...x.data, enabled: !enabled } }
                    : x,
                ),
              );
            if (isDraft) {
              if (isProvider) {
                trackUpdateProvider({
                  providerId: recordId,
                  name: label,
                  updates: { enabled: !enabled },
                  origin: "toggle",
                });
              } else {
                trackUpdateAgentPolicy({
                  agentPolicyId: recordId,
                  name: label,
                  policy: { enabled: !enabled },
                  origin: "toggle",
                });
              }
              syncNode();
              syncEdges();
              return;
            }
            // Live: the canvas follows the account, so it may only move once
            // the PUT lands — a refused toggle must leave it as it was.
            void (async () => {
              const ok = await (isProvider
                ? toggleProvider(recordId)
                : toggleAgentPolicy(recordId));
              if (!ok) return;
              syncNode();
              syncEdges();
            })();
          },
        });
      }
      if (mayDelete || (isNew && mayWrite)) {
        items.push({
          testLabel: isNew ? "Remove" : "Delete",
          label: isNew ? t("common.remove") : t("common.delete"),
          icon: isNew ? <CircleMinusIcon size={14} /> : <TrashIcon size={14} />,
          danger: !isNew,
          onClick: () => {
            void (async () => {
              if (!isNew) {
                const choice = await confirm({
                  title: t("controlCenter.deleteEntityTitle", { label: label }),
                  description: isDraft
                    ? t("controlCenter.isMarkedForDeletionAndRemovedWhenYou", {
                        label: label,
                      })
                    : t("controlCenter.youAreInLiveModeIsDeletedFrom", {
                        label: label,
                      }),
                  confirmText: t("common.delete"),
                  cancelText: t("common.cancel"),
                  type: "danger",
                });
                if (!choice) return;
              }
              if (isDraft) {
                if (isProvider) {
                  trackDeleteProvider({ providerId: recordId, name: label });
                } else {
                  trackDeleteAgentPolicy({
                    agentPolicyId: recordId,
                    name: label,
                  });
                }
              } else {
                const ok = await (isProvider
                  ? deleteAgentProvider(recordId)
                  : deleteAgentPolicy(recordId));
                // A refused DELETE leaves the record on the account; taking the
                // node off the canvas would claim it is gone.
                if (!ok) return;
              }
              removeNodeWithEdges(n.id);
            })();
          },
        });
      }
      return items;
    },
    [
      t,
      permission,
      isDraft,
      openProvider,
      openAgentPolicy,
      toggleProvider,
      toggleAgentPolicy,
      deleteAgentProvider,
      deleteAgentPolicy,
      trackUpdateProvider,
      trackUpdateAgentPolicy,
      trackDeleteProvider,
      trackDeleteAgentPolicy,
      confirm,
      setNodes,
      setEdges,
      removeNodeWithEdges,
    ],
  );

  const [peerRenameTarget, setPeerRenameTarget] = useState<Peer | null>(null);

  const handleLiveDeletePolicy = useCallback(async () => {
    if (!livePolicy?.id) return;
    const choice = await confirm({
      title: t("controlCenter.deletePolicyLiveTitle", {
        livePolicy_Policy: livePolicy.name ?? t("common.policy"),
      }),
      description: t("controlCenter.areYouSureYouWantToDeleteThis2"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      type: "danger",
    });
    if (!choice) return;
    await deletePolicy(livePolicy, () => removeNodeWithEdges(nodeId));
  }, [t, livePolicy, confirm, deletePolicy, removeNodeWithEdges, nodeId]);

  const handleLiveDeletePeer = useCallback(
    async (peer: Peer) => {
      const choice = await confirm({
        title: t("controlCenter.deletePeerLiveTitle", { peer: peer.name }),
        description: t("controlCenter.areYouSureYouWantToDeleteThis3"),
        confirmText: t("common.delete"),
        cancelText: t("common.cancel"),
        type: "danger",
      });
      if (!choice) return;
      notify({
        title: peer.name,
        description: t("controlCenter.peerWasSuccessfullyDeleted"),
        loadingMessage: t("controlCenter.deletingPeer"),
        promise: peerRequest.del({}, `/${peer.id}`).then(() => {
          mutate("/peers");
          mutate("/groups");
          removeNodeWithEdges(nodeId);
        }),
      });
    },
    [t, confirm, peerRequest, removeNodeWithEdges, nodeId],
  );

  // A placeholder's group assignments become the setup key's auto-groups.
  const peerDetailsItems = useCallback(
    (n: Node): MenuItem[] => {
      const isPeer =
        n.type === "peerNode" ||
        n.type === "sourcePeerNode" ||
        n.type === "expandedGroupPeer";
      const peerId =
        (n.data as { peer?: { id?: string } })?.peer?.id ??
        getPlaceholderPeer(n)?.id;
      if (!isPeer || !peerId) return [];
      const items: MenuItem[] = [
        {
          testLabel: "View Details",
          label: t("controlCenter.viewDetails"),
          icon: <EyeIcon size={14} />,
          onClick: () => {
            setSelectedDestinationGroup("");
            setSelectedPeerPanel(peerId);
          },
        },
      ];
      // Peer names aren't draft-managed: renaming an existing peer is a real PUT.
      const realPeer = (n.data as { peer?: Peer })?.peer;
      if (realPeer?.id && permission.peers.update) {
        items.push({
          testLabel: "Rename",
          label: t("controlCenter.rename"),
          icon: <PencilLineIcon size={14} />,
          onClick: () => setPeerRenameTarget(realPeer),
        });
      }
      // Draft mode manages peers on the canvas (Remove), never a real delete.
      if (!isDraft && realPeer?.id && permission.peers.delete) {
        items.push({
          testLabel: "Delete",
          label: t("common.delete"),
          icon: <TrashIcon size={14} />,
          danger: true,
          onClick: () => void handleLiveDeletePeer(realPeer),
        });
      }
      return items;
    },
    [
      t,
      setSelectedDestinationGroup,
      setSelectedPeerPanel,
      permission,
      isDraft,
      handleLiveDeletePeer,
    ],
  );

  const renameLivePeer = useCallback(
    async (peer: Peer, name: string) => {
      await peerRequest.put(
        {
          name,
          ssh_enabled: peer.ssh_enabled,
          login_expiration_enabled: peer.login_expiration_enabled,
          inactivity_expiration_enabled: peer.inactivity_expiration_enabled,
        },
        `/${peer.id}`,
      );
      setNodes((prev) =>
        prev.map((n) => {
          const p = (n.data as { peer?: Peer })?.peer;
          if (!p || p.id !== peer.id) return n;
          return { ...n, data: { ...n.data, peer: { ...p, name } } };
        }),
      );
      await mutate("/peers");
    },
    [peerRequest, setNodes],
  );

  const handleLiveRenameGroup = useCallback(
    async (target: Node) => {
      const group = getNodeGroup(target);
      if (!group?.id) return;
      const choice = await confirm({
        title: t("controlCenter.renameGroup", { group: group.name }),
        description: t("controlCenter.youAreInLiveModeSavingYourChanges"),
        confirmText: t("controlCenter.rename"),
        cancelText: t("common.cancel"),
        type: "warning",
        dismissOnOutsideClick: true,
      });
      if (!choice) return;
      openRename(target);
    },
    [t, confirm, openRename],
  );

  const liveRenameGroup = useCallback(
    async (target: Node, name: string) => {
      const groupId = getNodeGroup(target)?.id;
      const group = groups?.find((g) => g.id === groupId);
      if (!group?.id) return;
      const toIds = (list?: (string | { id?: string })[]) =>
        (list ?? []).map((x) => (typeof x === "string" ? x : x.id ?? ""));
      // The group PUT wants resources as {id, type} objects and rejects bare
      // id strings ("could not parse json").
      await groupRequest.put(
        { name, peers: toIds(group.peers), resources: group.resources },
        `/${group.id}`,
      );
      setNodes((prev) =>
        prev.map((n) => {
          const g = getNodeGroup(n);
          if (!g || g.id !== group.id) return n;
          return { ...n, data: { ...n.data, group: { ...g, name } } };
        }),
      );
      await mutate("/groups");
    },
    [groups, groupRequest, setNodes],
  );

  const items: MenuItem[] = useMemo(() => {
    // Always mounted and subscribed to the canvas nodes: rebuilding while
    // closed would rescan every node and edge on every drag frame.
    if (!position) return [];
    if (!node) return [];

    // Live actions hit the real account immediately, behind confirmations;
    // they never go through the changeset.
    if (!isDraft) {
      if (node.type === "policyNode") {
        if (!nodePolicy?.id) return [];
        const enabled = livePolicy?.enabled ?? true;
        const items: MenuItem[] = [...focusItems(node)];
        if (permission.policies.update) {
          items.push(
            {
              testLabel: "Edit",
              label: t("common.edit"),
              icon: <SquarePenIcon size={14} />,
              onClick: () => void handleLiveEditPolicy(),
            },
            {
              testLabel: enabled ? "Disable" : "Enable",
              label: enabled ? t("common.disable") : t("common.enable"),
              icon: enabled ? (
                <PowerOffIcon size={14} />
              ) : (
                <PowerIcon size={14} />
              ),
              onClick: () => void handleLiveTogglePolicy(),
            },
          );
        }
        if (permission.policies.delete) {
          items.push({
            testLabel: "Delete",
            label: t("common.delete"),
            icon: <TrashIcon size={14} />,
            danger: true,
            onClick: () => void handleLiveDeletePolicy(),
          });
        }
        return items;
      }
      if (isAgentNode(node)) {
        return [...focusItems(node), ...agentItems(node)];
      }
      if (isGroupNode(node)) {
        const group = getNodeGroup(node);
        const items: MenuItem[] = [
          ...focusItems(node),
          {
            testLabel: "View Details",
            label: t("controlCenter.viewDetails"),
            icon: <EyeIcon size={14} />,
            onClick: () => setSelectedDestinationGroup(group?.id || node.id),
          },
        ];
        if (
          !isAllGroup(group) &&
          canRenameGroup(group) &&
          permission.groups.update
        ) {
          items.push({
            testLabel: "Rename",
            label: t("controlCenter.rename"),
            icon: <PencilLineIcon size={14} />,
            onClick: () => void handleLiveRenameGroup(node),
          });
        }
        return items;
      }
      const isResourceNode =
        node.type === "resourceNode" || node.type === "destinationResourceNode";
      if (isResourceNode && liveResourceOf(node)) {
        const resEnabled =
          (node.data as { resource?: { enabled?: boolean } })?.resource
            ?.enabled ?? true;
        const items: MenuItem[] = [...focusItems(node)];
        if (permission.networks.update) {
          items.push(
            {
              testLabel: "Edit",
              label: t("common.edit"),
              icon: <SquarePenIcon size={14} />,
              onClick: () => void handleLiveEditResource(node),
            },
            {
              testLabel: resEnabled ? "Disable" : "Enable",
              label: resEnabled ? t("common.disable") : t("common.enable"),
              icon: resEnabled ? (
                <PowerOffIcon size={14} />
              ) : (
                <PowerIcon size={14} />
              ),
              onClick: () => void handleLiveToggleResource(node),
            },
          );
        }
        return items;
      }
      // Passing the real `network`, not a networkNodeId, routes the
      // routing-peer modal to its live POST path.
      if (node.type === "networkNode" && isFrameNode(node)) {
        const liveNetwork = (node.data as { network?: Network })?.network;
        if (!liveNetwork?.id) return [];
        const items: MenuItem[] = [
          {
            testLabel: "View Details",
            label: t("controlCenter.viewDetails"),
            icon: <EyeIcon size={14} />,
            onClick: () => handleViewNetworkDetails(node),
          },
          ...focusItems(node),
        ];
        if (permission.networks.update) {
          items.push(
            {
              testLabel: "Add Resource",
              label: t("common.addResource"),
              icon: <WorkflowIcon size={14} />,
              onClick: () =>
                setResourceEditor({ createInNetworkNodeId: nodeId }),
            },
            {
              testLabel: "Add Routing Peer",
              label: t("controlCenter.addRoutingPeer"),
              icon: <Share2Icon size={14} />,
              onClick: () => setRoutingPeerModal({ network: liveNetwork }),
            },
          );
        }
        if (permission.networks.delete) {
          items.push({
            testLabel: "Delete",
            label: t("common.delete"),
            icon: <TrashIcon size={14} />,
            danger: true,
            onClick: () => void deleteNetwork(nodeId),
          });
        }
        return items;
      }
      return [...focusItems(node), ...peerDetailsItems(node)];
    }

    if (isGroupNode(node)) {
      const group = getNodeGroup(node);
      const focus = focusItems(node);
      const remove: MenuItem = {
        testLabel: "Remove",
        label: t("common.remove"),
        icon: <CircleMinusIcon size={14} />,
        onClick: () => removeGroup(node),
      };
      const edit: MenuItem = {
        testLabel: "View Details",
        label: t("controlCenter.viewDetails"),
        icon: <EyeIcon size={14} />,
        onClick: () => setSelectedDestinationGroup(group?.id || node.id),
      };
      if (isAllGroup(group)) return [...focus, edit, remove];

      const items: MenuItem[] = [...focus, edit];
      // A draft group's rename deploys inside its own create, so it needs `create`;
      // the live branch checks `update` for an existing group.
      const mayRename =
        canRenameGroup(group) &&
        (isNewGroup(group)
          ? permission.groups.create
          : permission.groups.update);
      if (mayRename) {
        items.push({
          testLabel: "Rename",
          label: t("controlCenter.rename"),
          icon: <PencilLineIcon size={14} />,
          onClick: () => openRename(node),
        });
      }
      items.push(remove);
      if (!isNewGroup(group) && canDeleteGroup(group)) {
        items.push({
          testLabel: "Delete",
          label: t("common.delete"),
          icon: <TrashIcon size={14} />,
          onClick: () => void confirmAndDeleteGroups([node]),
          danger: true,
        });
      }
      return items;
    }

    if (isAgentNode(node)) {
      return [...focusItems(node), ...agentItems(node)];
    }

    if (node.type === "policyNode") {
      // Draft is deferred, not exempt: Approve & Deploy sends the same calls the live
      // branch gates. A DRAFT policy has no API object yet, so it needs `create`.
      const isDraftPolicy = nodeId.startsWith("policy-new-");
      const mayWrite = isDraftPolicy
        ? permission.policies.create
        : permission.policies.update;
      return [
        ...focusItems(node),
        ...(mayWrite
          ? [
              {
                testLabel: "Edit",
                label: t("common.edit"),
                icon: <SquarePenIcon size={14} />,
                onClick: () => {
                  setSelectedPolicy(policyClientId);
                  setPolicyModalOpen(true);
                },
              },
            ]
          : []),
        ...(policyMarkedForDeletion || !mayWrite
          ? []
          : [
              {
                testLabel: policyEnabled ? "Disable" : "Enable",
                label: policyEnabled ? t("common.disable") : t("common.enable"),
                icon: policyEnabled ? (
                  <PowerOffIcon size={14} />
                ) : (
                  <PowerIcon size={14} />
                ),
                onClick: handleTogglePolicy,
              },
            ]),
        // Off the canvas an existing policy deploys as a deletion, so it gets
        // Delete and its confirmation rather than a silent Remove.
        ...(isDraftPolicy
          ? mayWrite
            ? [
                {
                  testLabel: "Remove",
                  label: t("common.remove"),
                  icon: <CircleMinusIcon size={14} />,
                  onClick: () => void handleRemovePolicyFromCanvas(),
                },
              ]
            : []
          : permission.policies.delete
          ? [
              {
                testLabel: "Delete",
                label: t("common.delete"),
                icon: <TrashIcon size={14} />,
                onClick: handleDeletePolicy,
                danger: true,
              },
            ]
          : []),
      ];
    }

    // A user-device select node with a peer chosen is that peer already, so it
    // falls through to the plain Remove below.
    if (canRenamePeerNode(node)) {
      return [
        ...focusItems(node),
        ...peerDetailsItems(node),
        {
          testLabel: "Rename",
          label: t("controlCenter.rename"),
          icon: <PencilLineIcon size={14} />,
          onClick: () => openRename(node),
        },
        {
          testLabel: "Remove",
          label: t("common.remove"),
          icon: <CircleMinusIcon size={14} />,
          onClick: handleRemove,
        },
      ];
    }

    // Edit is draft-only: v1 doesn't rename existing networks.
    if (node.type === "networkNode" && isFrameNode(node)) {
      const draftNetwork = isDraftNetworkNode(node);
      const mayWrite = draftNetwork
        ? permission.networks.create
        : permission.networks.update;
      return [
        {
          testLabel: "View Details",
          label: t("controlCenter.viewDetails"),
          icon: <EyeIcon size={14} />,
          onClick: () => handleViewNetworkDetails(node),
        },
        ...focusItems(node),
        ...(draftNetwork && mayWrite
          ? [
              {
                testLabel: "Edit",
                label: t("common.edit"),
                icon: <SquarePenIcon size={14} />,
                onClick: () => setNetworkEditor({ networkNodeId: nodeId }),
              },
            ]
          : []),
        ...(mayWrite
          ? [
              {
                testLabel: "Add Resource",
                label: t("common.addResource"),
                icon: <WorkflowIcon size={14} />,
                // The row is created into the frame only on save.
                onClick: () =>
                  setResourceEditor({ createInNetworkNodeId: nodeId }),
              },
              {
                testLabel: "Add Resource Group",
                label: t("controlCenter.addResourceGroup"),
                icon: <GroupBadgeIcon size={14} />,
                onClick: () => addResourceGroupToFrame(nodeId),
              },
              {
                testLabel: "Add Routing Peer",
                label: t("controlCenter.addRoutingPeer"),
                icon: <Share2Icon size={14} />,
                onClick: () => setRoutingPeerModal({ networkNodeId: nodeId }),
              },
            ]
          : []),
        // Remove cancels a draft network's pending create; Delete marks an
        // existing one for removal on deploy.
        ...(draftNetwork
          ? mayWrite
            ? [
                {
                  testLabel: "Remove",
                  label: t("common.remove"),
                  icon: <CircleMinusIcon size={14} />,
                  onClick: handleRemove,
                },
              ]
            : []
          : permission.networks.delete
          ? [
              {
                testLabel: "Delete",
                label: t("common.delete"),
                icon: <TrashIcon size={14} />,
                danger: true,
                onClick: () => deleteNetwork(nodeId),
              },
            ]
          : []),
      ];
    }

    // resourceGroupNode isn't in GROUP_NODE_TYPES, so a folded existing group
    // would otherwise fall through to the remove-only default.
    if (
      nodeId.startsWith("resourcegroup-new-") ||
      node.type === "resourceGroupNode"
    ) {
      const isNewResourceGroup = nodeId.startsWith("resourcegroup-new-");
      const items: MenuItem[] = [];
      const mayRename =
        (isNewResourceGroup || canRenameGroup(getNodeGroup(node))) &&
        (isNewResourceGroup
          ? permission.groups.create
          : permission.groups.update);
      if (mayRename) {
        items.push({
          testLabel: "Rename",
          label: t("controlCenter.rename"),
          icon: <PencilLineIcon size={14} />,
          onClick: () => openRename(node),
        });
      }
      items.push({
        testLabel: "Remove",
        label: t("common.remove"),
        icon: <CircleMinusIcon size={14} />,
        onClick: handleRemove,
      });
      return items;
    }

    // An existing resource inside a network can only be Deleted, never removed
    // from the canvas; draft and standalone resources are Removed.
    if (node.type === "resourceNode") {
      const isDraftRes = nodeId.startsWith("resource-new-");
      const isFramed = !!node.parentId?.startsWith("network-");
      const resEnabled = getResourceNodeEnabled(node);
      // Resources live under a network, so they carry the networks permission.
      const mayWrite = isDraftRes
        ? permission.networks.create
        : permission.networks.update;
      const items: MenuItem[] = [...focusItems(node)];
      if (mayWrite) {
        items.push({
          testLabel: "Edit",
          label: t("common.edit"),
          icon: <SquarePenIcon size={14} />,
          onClick: () => setResourceEditor({ nodeId }),
        });
      }
      if (isDraftRes && mayWrite) {
        items.push({
          testLabel: "Rename",
          label: t("controlCenter.rename"),
          icon: <PencilLineIcon size={14} />,
          onClick: () => openRename(node),
        });
      }
      if (mayWrite) {
        items.push({
          testLabel: resEnabled ? "Disable" : "Enable",
          label: resEnabled ? t("common.disable") : t("common.enable"),
          icon: resEnabled ? (
            <PowerOffIcon size={14} />
          ) : (
            <PowerIcon size={14} />
          ),
          onClick: () => toggleResourceEnabled(nodeId),
        });
      }
      if (!isDraftRes && isFramed) {
        if (permission.networks.delete) {
          items.push({
            testLabel: "Delete",
            label: t("common.delete"),
            icon: <TrashIcon size={14} />,
            onClick: () => deleteResource(nodeId),
            danger: true,
          });
        }
      } else if (mayWrite) {
        items.push({
          testLabel: "Remove",
          label: t("common.remove"),
          icon: <CircleMinusIcon size={14} />,
          onClick: handleRemove,
        });
      }
      return items;
    }

    return [
      ...focusItems(node),
      ...peerDetailsItems(node),
      {
        testLabel: "Remove",
        label: t("common.remove"),
        icon: <CircleMinusIcon size={14} />,
        onClick: handleRemove,
      },
    ];
  }, [
    t,
    position,
    isDraft,
    node,
    focusItems,
    peerDetailsItems,
    liveResourceOf,
    handleLiveEditResource,
    handleLiveToggleResource,
    handleLiveRenameGroup,
    nodeId,
    nodePolicy,
    livePolicy,
    permission.policies.create,
    permission.policies.update,
    permission.policies.delete,
    permission.groups.create,
    permission.groups.update,
    permission.networks.create,
    permission.networks.update,
    permission.networks.delete,
    handleLiveEditPolicy,
    handleViewNetworkDetails,
    handleLiveTogglePolicy,
    handleLiveDeletePolicy,
    deleteNetwork,
    policyEnabled,
    policyMarkedForDeletion,
    handleRemove,
    removeGroup,
    setSelectedDestinationGroup,
    confirmAndDeleteGroups,
    canDeleteGroup,
    agentItems,
    handleTogglePolicy,
    handleDeletePolicy,
    handleRemovePolicyFromCanvas,
    setRoutingPeerModal,
    setResourceEditor,
    setNetworkEditor,
    setSelectedPolicy,
    setPolicyModalOpen,
    openRename,
    toggleResourceEnabled,
    deleteResource,
    addResourceGroupToFrame,
  ]);

  useEffect(() => {
    if (!position) return;
    document.addEventListener("click", onDismiss);
    document.addEventListener("scroll", onDismiss, true);
    return () => {
      document.removeEventListener("click", onDismiss);
      document.removeEventListener("scroll", onDismiss, true);
    };
  }, [position, onDismiss]);

  return (
    <>
      {position && items.length > 0 && (
        <div
          ref={menuRef}
          data-testid="cc-node-context-menu"
          className="fixed z-50 min-w-[180px] rounded-md border border-nb-gray-900 bg-nb-gray-940 p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
          style={{
            top: (menuPosition ?? position).y,
            left: (menuPosition ?? position).x,
          }}
        >
          {items.map((item, i) => (
            <React.Fragment key={item.label}>
              {item.danger && i > 0 && !items[i - 1].danger && (
                <div className={"-mx-1 my-1 h-px bg-nb-gray-910"} />
              )}
              <button
                data-testid={`cc-menu-${menuItemSlug(item.testLabel)}`}
                onClick={(e) => {
                  // The document listener would dismiss the panel this item
                  // may have just opened.
                  e.stopPropagation();
                  item.onClick?.();
                  onClose();
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors cursor-pointer",
                  item.danger
                    ? "text-red-500 hover:bg-red-900/20 hover:text-red-500"
                    : "text-nb-gray-300 hover:bg-nb-gray-900 hover:text-nb-gray-50 dark:hover:text-gray-50",
                )}
              >
                {item.icon}
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      <GroupRenameModal
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title={
          isPlaceholderRename
            ? t("controlCenter.renamePeer")
            : isResourceRename
            ? t("controlCenter.renameResource")
            : undefined
        }
        description={
          isPlaceholderRename
            ? t("controlCenter.setAnEasilyIdentifiableNameForThisPeer")
            : isResourceRename
            ? t("controlCenter.setAnEasilyIdentifiableNameForThisResource")
            : undefined
        }
        inputPlaceholder={
          isPlaceholderRename
            ? t("controlCenter.eGBackupServer")
            : isResourceRename
            ? t("controlCenter.eGInternalAPI")
            : undefined
        }
        currentName={
          isPlaceholderRename
            ? placeholderCurrentName
            : isResourceRename
            ? resourceCurrentName
            : getNodeGroup(renameTarget ?? undefined)?.name ?? ""
        }
        takenNames={
          isPlaceholderRename
            ? placeholderTakenNames
            : isResourceRename
            ? resourceTakenNames
            : groupTakenNames
        }
        duplicateError={
          isPlaceholderRename || isResourceRename
            ? t("controlCenter.nameAlreadyTakenPleaseChooseAnotherName")
            : undefined
        }
        onRename={(name) => {
          if (renameTarget) {
            if (isPlaceholderRename) renamePlaceholder(renameTarget.id, name);
            else if (isResourceRename) renameResource(renameTarget.id, name);
            else if (!isDraft) void liveRenameGroup(renameTarget, name);
            else renameGroup(renameTarget, name);
          }
          setRenameOpen(false);
        }}
      />

      <Modal
        open={!!peerRenameTarget}
        onOpenChange={(open) => !open && setPeerRenameTarget(null)}
      >
        {peerRenameTarget && (
          <EditPeerNameModal
            peer={peerRenameTarget}
            initialName={peerRenameTarget.name ?? ""}
            onSuccess={(name) => {
              void renameLivePeer(peerRenameTarget, name);
              setPeerRenameTarget(null);
            }}
          />
        )}
      </Modal>
    </>
  );
};
