import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CircleMinusIcon,
  ListIcon,
  WorkflowIcon,
  PencilLineIcon,
  Share2Icon,
  SquarePenIcon,
  PowerIcon,
  PowerOffIcon,
  TrashIcon,
} from "lucide-react";
import { Node } from "@xyflow/react";
import { cn } from "@utils/helpers";
import { mutate } from "swr";
import { Policy } from "@/interfaces/Policy";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { usePolicies } from "@/contexts/PoliciesProvider";
import { useCanvasState } from "@/modules/control-center/ControlCenterContext";
import { useControlCenterPolicy } from "@/modules/control-center/ControlCenterPolicyModals";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import { useDraftChangeset } from "@/modules/control-center/draft/DraftChangesetContext";
import {
  canRenameGroup,
  getNodeGroup,
  isAllGroup,
  isGroupNode,
  isNewGroup,
  useDraftGroupActions,
} from "@/modules/control-center/hooks/useDraftGroupActions";
import { useDraftNodeCreation } from "@/modules/control-center/hooks/useDraftNodeCreation";
import { useDraftNetworkActions } from "@/modules/control-center/hooks/useDraftNetworkActions";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { GroupRenameModal } from "@/modules/control-center/draft/GroupRenameModal";
import { useEdgeAwareMenuPosition } from "@/modules/control-center/hooks/useEdgeAwareMenuPosition";
import {
  DraftNetworkRef,
  getPlaceholderPeer,
  isDraftNetworkNode,
  isFrameNode,
  PLACEHOLDER_BASE_NAMES,
} from "@/modules/control-center/utils/helpers";
import { NetworkResource } from "@/interfaces/Network";
import { canRenamePeerNode } from "@/modules/control-center/utils/node-capabilities";

type MenuPosition = {
  x: number;
  y: number;
};

type MenuItem = {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
};

interface NodeContextMenuProps {
  position: MenuPosition | null;
  nodeId: string;
  // Close just the menu (after picking an item — keeps any panel it opened).
  onClose: () => void;
  // Dismiss everything (menu + panel + components) on an outside click.
  onDismiss: () => void;
}

export const NodeContextMenu = ({
  position,
  nodeId,
  onClose,
  onDismiss,
}: NodeContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  // Where the menu renders — flipped/clamped away from the viewport edges.
  const menuPosition = useEdgeAwareMenuPosition(position, menuRef);
  const {
    nodes,
    setNodes,
    setEdges,
    setSelectedDestinationGroup,
    refreshLiveViewRef,
  } = useCanvasState();
  const { updatePolicy, serializeRules } = usePolicies();
  const { permission } = usePermissions();
  const { isDraft, setResourceEditor, setRoutingPeerModal, setNetworkEditor } =
    useDraftMode();
  const { setSelectedPolicy, setPolicyModalOpen } = useControlCenterPolicy();
  const { groups, policies } = useControlCenterData();
  const {
    trackSetPolicyEnabled,
    trackUpdatePolicy,
    trackDeletePolicy,
    trackUpdateResource,
    trackDeleteResource,
  } = useDraftChangeset();
  const { confirm } = useDialog();
  const {
    renameGroup,
    removeGroup,
    confirmAndDeleteGroups,
    removeNodeWithEdges,
  } = useDraftGroupActions();
  const { addResourceToFrame, addResourceGroupToFrame } = useDraftNodeCreation();
  const { syncDraftResource } = useDraftNetworkActions();

  // The rename modal must survive the menu closing (position → null), so the
  // target node is snapshotted separately. It targets either a group node or
  // a placeholder peer. The target stays set through the close animation
  // (separate open flag) — clearing it on close would flip the title back to
  // the group default while the modal fades out.
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
    "Peer";
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

  // Placeholder names live only on the canvas node — the real name comes from
  // the machine once the peer is installed.
  const renamePlaceholder = useCallback(
    (id: string, name: string) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, placeholderName: name } }
            : n,
        ),
      );
    },
    [setNodes],
  );

  // Rename a draft resource node (canvas + changeset re-sync for saved ones).
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

  // Enable/disable a resource on the canvas (dims the node), mirroring the
  // policy Enable/Disable toggle. For an EXISTING resource it also records an
  // update-resource change so the enabled state deploys.
  const toggleResourceEnabled = useCallback(
    (id: string) => {
      const target = nodes.find((n) => n.id === id);
      const enabled = !(
        (target?.data as { enabled?: boolean })?.enabled ?? true
      );
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, enabled } } : n,
        ),
      );
      // Draft resources carry their enabled state via their create-resource
      // change (re-sync after the canvas update). Existing resources record an
      // update-resource change.
      if (id.startsWith("resource-new-")) {
        setTimeout(() => syncDraftResource(id), 0);
        return;
      }
      const resource = (target?.data as { resource?: NetworkResource })
        ?.resource;
      const net = (target?.data as { draftNetwork?: DraftNetworkRef })
        ?.draftNetwork;
      if (resource?.id && net?.networkId) {
        trackUpdateResource({
          resourceId: resource.id,
          networkId: net.networkId,
          name: resource.name,
          networkName: net.name,
          address: resource.address,
          description: resource.description,
          enabled,
          groupIds: ((resource.groups as (string | { id?: string })[]) ?? [])
            .map((g) => (typeof g === "string" ? g : g.id ?? ""))
            .filter(Boolean),
        });
      }
    },
    [nodes, setNodes, trackUpdateResource, syncDraftResource],
  );

  // Delete an EXISTING resource: confirm, record the delete-resource change,
  // then take it off the canvas.
  const deleteResource = useCallback(
    async (id: string) => {
      const target = nodes.find((n) => n.id === id);
      const resourceName =
        (target?.data as { resource?: NetworkResource })?.resource?.name ??
        "Resource";
      const choice = await confirm({
        title: `Delete resource “${resourceName}”?`,
        description:
          "It will be marked for deletion and deleted when you review and deploy.",
        confirmText: "Delete",
        cancelText: "Cancel",
        type: "danger",
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
    [nodes, confirm, trackDeleteResource, removeNodeWithEdges],
  );

  const node = useMemo(
    () => nodes.find((n) => n.id === nodeId),
    [nodes, nodeId],
  );

  const handleRemove = useCallback(() => {
    removeNodeWithEdges(nodeId);
  }, [nodeId, removeNodeWithEdges]);

  // ---- Policy actions (draft) ----

  const nodePolicy = node?.data?.policy as Policy | undefined;
  const policyClientId = nodeId.startsWith("policy-")
    ? nodeId.replace("policy-", "")
    : "";
  const policyEnabled = nodePolicy?.rules?.[0]?.enabled ?? nodePolicy?.enabled;

  const handleTogglePolicy = useCallback(() => {
    if (!nodePolicy) return;
    const enabled = !policyEnabled;
    const originalEnabled =
      policies?.find((p) => p.id === nodePolicy.id)?.enabled ?? !enabled;

    trackSetPolicyEnabled({
      policyId: policyClientId,
      name: nodePolicy.name ?? "Policy",
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
    nodePolicy,
    policyEnabled,
    policies,
    policyClientId,
    nodeId,
    trackSetPolicyEnabled,
    setNodes,
    setEdges,
  ]);

  // Remove a policy from the CANVAS (no confirm, nothing deleted): the
  // policy node and its edges go away; its source and destination nodes STAY
  // on the canvas. The policy itself loses its sources/destinations: a
  // draft-created policy drops its pending create, an existing policy records
  // an update-policy change with emptied sides (superseding any pending
  // update/toggle) so the disconnect deploys.
  const handleRemovePolicyFromCanvas = useCallback(() => {
    if (!nodePolicy) return;

    if (nodeId.startsWith("policy-new-")) {
      // Cancels the pending create (changeset semantics for "new-" ids).
      trackDeletePolicy({
        policyId: policyClientId,
        name: nodePolicy.name ?? "Policy",
      });
    } else {
      const rule = nodePolicy.rules?.[0];
      trackUpdatePolicy({
        policyId: policyClientId,
        policy: {
          ...nodePolicy,
          rules: rule
            ? [
                {
                  ...rule,
                  sources: [],
                  destinations: [],
                  sourceResource: undefined,
                  destinationResource: undefined,
                },
                ...(nodePolicy.rules?.slice(1) ?? []),
              ]
            : nodePolicy.rules,
        },
      });
    }

    removeNodeWithEdges(nodeId);
  }, [
    nodePolicy,
    nodeId,
    policyClientId,
    trackDeletePolicy,
    trackUpdatePolicy,
    removeNodeWithEdges,
  ]);

  // Delete an EXISTING policy: confirm, record the delete-policy change, then
  // take it off the canvas.
  const handleDeletePolicy = useCallback(async () => {
    if (!nodePolicy) return;
    const choice = await confirm({
      title: `Delete policy “${nodePolicy.name ?? "Policy"}”?`,
      description:
        "It will be marked for deletion and deleted when you review and deploy.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    trackDeletePolicy({
      policyId: policyClientId,
      name: nodePolicy.name ?? "Policy",
    });
    removeNodeWithEdges(nodeId);
  }, [
    nodePolicy,
    policyClientId,
    nodeId,
    confirm,
    trackDeletePolicy,
    removeNodeWithEdges,
  ]);

  // ---- Policy actions (live) ----

  // The canvas node's policy may predate the last save — the SWR list is the
  // freshest copy of a live policy.
  const livePolicy = useMemo(
    () =>
      (nodePolicy?.id &&
        policies?.find((p) => p.id === nodePolicy.id)) ||
      nodePolicy,
    [policies, nodePolicy],
  );

  // Live actions hit the real account — every one confirms first.
  const handleLiveEditPolicy = useCallback(async () => {
    if (!livePolicy?.id) return;
    const choice = await confirm({
      title: `Edit policy “${livePolicy.name ?? "Policy"}”?`,
      description:
        "You are in live mode — saving your changes will apply them to your account immediately.",
      confirmText: "Edit",
      cancelText: "Cancel",
      type: "warning",
    });
    if (!choice) return;
    setSelectedPolicy(livePolicy.id);
    setPolicyModalOpen(true);
  }, [livePolicy, confirm, setSelectedPolicy, setPolicyModalOpen]);

  const handleLiveTogglePolicy = useCallback(async () => {
    if (!livePolicy?.id) return;
    const enabled = !(livePolicy.enabled ?? true);
    const choice = await confirm({
      title: `${enabled ? "Enable" : "Disable"} policy “${
        livePolicy.name ?? "Policy"
      }”?`,
      description: `You are in live mode — the policy will be ${
        enabled ? "enabled" : "disabled"
      } on your account immediately.`,
      confirmText: enabled ? "Enable" : "Disable",
      cancelText: "Cancel",
      type: "warning",
    });
    if (!choice) return;
    updatePolicy(
      livePolicy,
      { enabled, rules: serializeRules(livePolicy.rules, enabled) },
      (p) => {
        mutate("/policies");
        // Same in-place canvas patch as a live modal save — no fitView,
        // no refetch wait.
        refreshLiveViewRef.current(p);
      },
      enabled
        ? "The policy was successfully enabled"
        : "The policy was successfully disabled",
    );
  }, [livePolicy, confirm, updatePolicy, serializeRules, refreshLiveViewRef]);

  // ---- Menu items ----

  const items: MenuItem[] = useMemo(() => {
    if (!node) return [];

    // Live mode: only policy nodes get a menu (see onNodeContextMenu) —
    // Edit and Disable/Enable act on the real account behind confirmations.
    // No Delete in live; deleting stays a draft/deploy flow.
    if (!isDraft) {
      if (node.type !== "policyNode" || !nodePolicy?.id) return [];
      if (!permission.policies.update) return [];
      const enabled = livePolicy?.enabled ?? true;
      return [
        {
          label: "Edit",
          icon: <SquarePenIcon size={14} />,
          onClick: () => void handleLiveEditPolicy(),
        },
        {
          label: enabled ? "Disable" : "Enable",
          icon: enabled ? <PowerOffIcon size={14} /> : <PowerIcon size={14} />,
          onClick: () => void handleLiveTogglePolicy(),
        },
      ];
    }

    if (isGroupNode(node)) {
      const group = getNodeGroup(node);
      const remove: MenuItem = {
        label: "Remove",
        icon: <CircleMinusIcon size={14} />,
        onClick: () => removeGroup(node),
      };
      // Opens the group panel (name/metadata + assign peers) — the same thing
      // a left-click on the node does; surfaced here so it's discoverable.
      const edit: MenuItem = {
        label: "Details",
        icon: <ListIcon size={14} />,
        onClick: () => setSelectedDestinationGroup(group?.id || node.id),
      };
      // "All" can neither be renamed nor deleted.
      if (isAllGroup(group)) return [edit, remove];

      const items: MenuItem[] = [edit];
      if (canRenameGroup(group)) {
        items.push({
          label: "Rename",
          icon: <PencilLineIcon size={14} />,
          onClick: () => openRename(node),
        });
      }
      items.push(remove);
      if (!isNewGroup(group)) {
        items.push({
          label: "Delete",
          icon: <TrashIcon size={14} />,
          onClick: () => void confirmAndDeleteGroups([node]),
          danger: true,
        });
      }
      return items;
    }

    if (node.type === "policyNode") {
      return [
        {
          label: "Edit",
          icon: <SquarePenIcon size={14} />,
          onClick: () => {
            setSelectedPolicy(policyClientId);
            setPolicyModalOpen(true);
          },
        },
        {
          label: policyEnabled ? "Disable" : "Enable",
          icon: policyEnabled ? (
            <PowerOffIcon size={14} />
          ) : (
            <PowerIcon size={14} />
          ),
          onClick: handleTogglePolicy,
        },
        // Remove is canvas-only (the policy node goes; its sources and
        // destinations stay on the canvas — nothing is deleted).
        // Delete is reserved for policies that exist in the API and will
        // really be deleted on deploy.
        {
          label: "Remove",
          icon: <CircleMinusIcon size={14} />,
          onClick: () => void handleRemovePolicyFromCanvas(),
        },
        ...(nodeId.startsWith("policy-new-")
          ? []
          : [
              {
                label: "Delete",
                icon: <TrashIcon size={14} />,
                onClick: handleDeletePolicy,
                danger: true,
              },
            ]),
      ];
    }

    // Placeholder peers (Server / Agent / User Device) — canvas-only rename.
    // A user-device select node with a peer chosen is that peer already, so
    // it falls through to the plain Remove below.
    if (canRenamePeerNode(node)) {
      return [
        {
          label: "Rename",
          icon: <PencilLineIcon size={14} />,
          onClick: () => openRename(node),
        },
        {
          label: "Remove",
          icon: <CircleMinusIcon size={14} />,
          onClick: handleRemove,
        },
      ];
    }

    // Network frames (draft or existing dropped onto the canvas): frame
    // actions apply to both; Edit (name + description) is draft-only, since
    // v1 doesn't rename existing networks.
    if (node.type === "networkNode" && isFrameNode(node)) {
      const draftNetwork = isDraftNetworkNode(node);
      return [
        ...(draftNetwork
          ? [
              {
                label: "Edit",
                icon: <SquarePenIcon size={14} />,
                onClick: () => setNetworkEditor({ networkNodeId: nodeId }),
              },
            ]
          : []),
        {
          label: "Add Resource",
          icon: <WorkflowIcon size={14} />,
          onClick: () => addResourceToFrame(nodeId),
        },
        {
          label: "Add Resource Group",
          icon: <GroupBadgeIcon size={14} />,
          onClick: () => addResourceGroupToFrame(nodeId),
        },
        {
          label: "Add Routing Peer",
          icon: <Share2Icon size={14} />,
          onClick: () => setRoutingPeerModal({ networkNodeId: nodeId }),
        },
        {
          label: "Remove",
          icon: <CircleMinusIcon size={14} />,
          onClick: handleRemove,
        },
      ];
    }

    // Draft resource groups (inside a frame): Rename / Remove.
    if (nodeId.startsWith("resourcegroup-new-")) {
      return [
        {
          label: "Rename",
          icon: <PencilLineIcon size={14} />,
          onClick: () => openRename(node),
        },
        {
          label: "Remove",
          icon: <CircleMinusIcon size={14} />,
          onClick: handleRemove,
        },
      ];
    }

    // Resource nodes (draft or existing): Edit + Enable/Disable for all;
    // Rename for draft only. An existing resource INSIDE a network can only be
    // Deleted (not removed from canvas); draft/standalone resources are
    // Removed.
    if (node.type === "resourceNode") {
      const isDraftRes = nodeId.startsWith("resource-new-");
      const isFramed = !!node.parentId?.startsWith("network-");
      const resEnabled =
        (node.data as { enabled?: boolean }).enabled ?? true;
      const items: MenuItem[] = [
        {
          label: "Edit",
          icon: <SquarePenIcon size={14} />,
          onClick: () => setResourceEditor({ nodeId }),
        },
      ];
      if (isDraftRes) {
        items.push({
          label: "Rename",
          icon: <PencilLineIcon size={14} />,
          onClick: () => openRename(node),
        });
      }
      items.push({
        label: resEnabled ? "Disable" : "Enable",
        icon: resEnabled ? (
          <PowerOffIcon size={14} />
        ) : (
          <PowerIcon size={14} />
        ),
        onClick: () => toggleResourceEnabled(nodeId),
      });
      // Existing resource inside a network → Delete only; otherwise Remove.
      if (!isDraftRes && isFramed) {
        items.push({
          label: "Delete",
          icon: <TrashIcon size={14} />,
          onClick: () => deleteResource(nodeId),
          danger: true,
        });
      } else {
        items.push({
          label: "Remove",
          icon: <CircleMinusIcon size={14} />,
          onClick: handleRemove,
        });
      }
      return items;
    }

    return [
      {
        label: "Remove",
        icon: <CircleMinusIcon size={14} />,
        onClick: handleRemove,
      },
    ];
  }, [
    isDraft,
    node,
    nodeId,
    nodePolicy,
    livePolicy,
    permission.policies.update,
    handleLiveEditPolicy,
    handleLiveTogglePolicy,
    policyEnabled,
    handleRemove,
    removeGroup,
    setSelectedDestinationGroup,
    confirmAndDeleteGroups,
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
    addResourceToFrame,
    addResourceGroupToFrame,
  ]);

  useEffect(() => {
    if (!position) return;
    // An outside click/scroll dismisses everything; item clicks stopPropagation
    // so they don't reach this listener.
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
          className="fixed z-50 min-w-[180px] rounded-md border border-nb-gray-900 bg-nb-gray-940 p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
          style={{
            top: (menuPosition ?? position).y,
            left: (menuPosition ?? position).x,
          }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              onClick={(e) => {
                // Keep this click from reaching the document listener (which
                // would dismiss the panel this item may have just opened).
                e.stopPropagation();
                item.onClick?.();
                onClose();
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors cursor-pointer",
                item.danger
                  ? "text-red-500 hover:bg-red-900/20 hover:text-red-500"
                  : "text-nb-gray-300 hover:bg-nb-gray-900 hover:text-gray-50",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}

      <GroupRenameModal
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title={
          isPlaceholderRename
            ? "Rename Peer"
            : isResourceRename
            ? "Rename Resource"
            : undefined
        }
        description={
          isPlaceholderRename
            ? "Set an easily identifiable name for this peer."
            : isResourceRename
            ? "Set an easily identifiable name for this resource."
            : undefined
        }
        inputPlaceholder={
          isPlaceholderRename
            ? "e.g., Backup Server"
            : isResourceRename
            ? "e.g., Internal API"
            : undefined
        }
        currentName={
          isPlaceholderRename
            ? placeholderCurrentName
            : isResourceRename
            ? resourceCurrentName
            : getNodeGroup(renameTarget ?? undefined)?.name ?? ""
        }
        groups={
          isPlaceholderRename || isResourceRename ? undefined : groups
        }
        takenNames={
          isPlaceholderRename
            ? placeholderTakenNames
            : isResourceRename
            ? resourceTakenNames
            : undefined
        }
        duplicateError={
          isPlaceholderRename || isResourceRename
            ? "Name already taken. Please choose another name."
            : undefined
        }
        onRename={(name) => {
          if (renameTarget) {
            if (isPlaceholderRename) renamePlaceholder(renameTarget.id, name);
            else if (isResourceRename) renameResource(renameTarget.id, name);
            else renameGroup(renameTarget, name);
          }
          setRenameOpen(false);
        }}
      />
    </>
  );
};
