import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CircleMinusIcon,
  FocusIcon,
  EyeIcon,
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
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { Group, GroupIssued } from "@/interfaces/Group";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { usePolicies } from "@/contexts/PoliciesProvider";
import {
  useCanvasState,
  useControlCenterUI,
  useDestinationGroup,
} from "@/modules/control-center/ControlCenterContext";
import { getNodeRect } from "@/modules/control-center/utils/canvas-transition";
import { useControlCenterPolicy } from "@/modules/control-center/ControlCenterPolicyModals";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import useGroupsUsage from "@/modules/groups/useGroupsUsage";
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
import { useNodeRemoval } from "@/modules/control-center/hooks/useNodeRemoval";
import { useDraftNetworkActions } from "@/modules/control-center/hooks/useDraftNetworkActions";
import { useDeleteNetwork } from "@/modules/control-center/hooks/useDeleteNetwork";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { Modal } from "@components/modal/Modal";
import { GroupRenameModal } from "@/modules/control-center/draft/GroupRenameModal";
import { EditPeerNameModal } from "@/modules/peers/EditPeerNameModal";
import { useEdgeAwareMenuPosition } from "@/modules/control-center/hooks/useEdgeAwareMenuPosition";
import {
  DraftNetworkRef,
  getPlaceholderPeer,
  isDraftNetworkNode,
  isFocusWorthy,
  isFrameNode,
  PLACEHOLDER_BASE_NAMES,
} from "@/modules/control-center/utils/helpers";
import { Network, NetworkResource } from "@/interfaces/Network";
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
  const { setSelectedPolicy, setPolicyModalOpen } = useControlCenterPolicy();
  const { groups, policies } = useControlCenterData();
  // Group deletability mirrors the Groups page: an IdP-issued group can't be
  // deleted, it needs the delete permission, and it must be unused everywhere
  // (policies, DNS, routes, setup keys, users, resources, peers).
  const { data: groupsUsage } = useGroupsUsage();
  const {
    trackSetPolicyEnabled,
    trackUpdatePolicy,
    trackDeletePolicy,
    trackUpdateResource,
    trackDeleteResource,
    trackInstallPeer,
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

  // Group names must be unique across API groups AND the draft groups on the
  // canvas (name-based matching becomes ambiguous otherwise), and "All" is
  // reserved for the system group.
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
      // The pending install-peer entry follows the rename.
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
        const groupIds = ((resource.groups as (string | { id?: string })[]) ??
          [])
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
          // Only `enabled` changes here — the rest mirror the live resource, so
          // toggling back to the original drops the change.
          original: {
            enabled: resource.enabled ?? true,
            name: resource.name,
            address: resource.address,
            description: resource.description,
            groupIds,
          },
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
    [nodes, confirm, trackDeleteResource, removeNodeWithEdges],
  );

  const node = useMemo(
    () => nodes.find((n) => n.id === nodeId),
    [nodes, nodeId],
  );

  // Whether a group can actually be deleted via the API — same rule as the
  // Groups page's action menu (see GroupsActionCell / GroupProvider). Delete is
  // only offered when this is true so we never surface an action that fails.
  const canDeleteGroup = useCallback(
    (group?: Group) => {
      if (!group?.id) return false;
      if (group.issued === GroupIssued.INTEGRATION) return false;
      if (!permission.groups.delete) return false;
      const usage = groupsUsage?.find((g) => g.id === group.id);
      if (!usage) return false;
      const inUse =
        (usage.peers_count ?? 0) > 0 ||
        (usage.policies_count ?? 0) > 0 ||
        (usage.nameservers_count ?? 0) > 0 ||
        (usage.zones_count ?? 0) > 0 ||
        (usage.routes_count ?? 0) > 0 ||
        (usage.setup_keys_count ?? 0) > 0 ||
        (usage.users_count ?? 0) > 0 ||
        (usage.resources_count ?? 0) > 0;
      return !inUse;
    },
    [groupsUsage, permission.groups.delete],
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

  // Canvas-only policy removal — shared with the Delete/Backspace keys via
  // useNodeRemoval (see the hook for the changeset semantics).
  const { removePolicyFromCanvas } = useNodeRemoval();
  const handleRemovePolicyFromCanvas = useCallback(() => {
    if (node) removePolicyFromCanvas(node);
  }, [node, removePolicyFromCanvas]);

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
      dismissOnOutsideClick: true,
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

  // Opens the editor directly; the "you are in live mode" confirmation is
  // deferred to when the user clicks Save Changes (onBeforeSave in the modal).
  const handleLiveEditPolicy = useCallback(() => {
    if (!livePolicy?.id) return;
    setSelectedPolicy(livePolicy.id);
    setPolicyModalOpen(true);
  }, [livePolicy, setSelectedPolicy, setPolicyModalOpen]);

  // "View Details" on a network frame drills into its single-network view —
  // the draft drill in draft, the live drill (with the frame rect for the
  // dive animation) in live. Same as clicking the frame.
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
      title: `${enabled ? "Enable" : "Disable"} policy “${
        livePolicy.name ?? "Policy"
      }”?`,
      description: `You are in live mode. The policy will be ${
        enabled ? "enabled" : "disabled"
      } on your account immediately.`,
      confirmText: enabled ? "Enable" : "Disable",
      cancelText: "Cancel",
      type: "warning",
      dismissOnOutsideClick: true,
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

  // ---- Live resource actions (edit / disable) — confirmed like every
  // live action. The node carries the resource + its network ref. ----

  const liveResourceOf = useCallback(
    (n: Node) => {
      const resource = (n.data as { resource?: NetworkResource })?.resource;
      const networkId =
        (n.data as { draftNetwork?: { networkId?: string } })?.draftNetwork
          ?.networkId ?? n.parentId?.replace("network-", "");
      return resource?.id && networkId ? { resource, networkId } : null;
    },
    [],
  );

  const handleLiveEditResource = useCallback(
    async (n: Node) => {
      const ref = liveResourceOf(n);
      if (!ref) return;
      const choice = await confirm({
        title: `Edit resource “${ref.resource.name ?? "Resource"}”?`,
        description:
          "You are in live mode. Saving your changes will apply them to your account immediately.",
        confirmText: "Edit",
        cancelText: "Cancel",
        type: "warning",
        dismissOnOutsideClick: true,
      });
      if (!choice) return;
      setLiveResourceEditor({
        resourceId: ref.resource.id!,
        networkId: ref.networkId,
      });
    },
    [liveResourceOf, confirm, setLiveResourceEditor],
  );

  const handleLiveToggleResource = useCallback(
    async (n: Node) => {
      const ref = liveResourceOf(n);
      if (!ref) return;
      const enabled = !(ref.resource.enabled ?? true);
      const choice = await confirm({
        title: `${enabled ? "Enable" : "Disable"} resource “${
          ref.resource.name ?? "Resource"
        }”?`,
        description: `You are in live mode. The resource will be ${
          enabled ? "enabled" : "disabled"
        } immediately.`,
        confirmText: enabled ? "Enable" : "Disable",
        cancelText: "Cancel",
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
    [liveResourceOf, confirm, resourceRequest, setNodes],
  );

  // "Focus" (live AND draft): enters Focus Mode on this node — dims
  // everything off its edge path. Only shown where it declutters
  // (isFocusWorthy: 4+ edges, 2+ policies in the neighborhood).
  const focusItems = useCallback(
    (n: Node): MenuItem[] => {
      // Already focused → no Focus entry on the focused node itself.
      if (focusedNodeId === n.id) return [];
      if (!isFocusWorthy(n.id, nodes, edges)) return [];
      return [
        {
          label: "Focus",
          icon: <FocusIcon size={14} />,
          onClick: () => setFocusedNodeId(n.id),
        },
      ];
    },
    [nodes, edges, focusedNodeId, setFocusedNodeId],
  );

  const [peerRenameTarget, setPeerRenameTarget] = useState<Peer | null>(null);

  // Delete a policy against the account (live only): confirm, DELETE, then drop
  // the node from the canvas.
  const handleLiveDeletePolicy = useCallback(async () => {
    if (!livePolicy?.id) return;
    const choice = await confirm({
      title: `Delete '${livePolicy.name ?? "Policy"}'?`,
      description:
        "Are you sure you want to delete this access control policy? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    await deletePolicy(livePolicy, () => removeNodeWithEdges(nodeId));
  }, [livePolicy, confirm, deletePolicy, removeNodeWithEdges, nodeId]);

  // Delete a peer against the account (live only): confirm, DELETE /peers/{id},
  // refresh, then drop the node from the canvas.
  const handleLiveDeletePeer = useCallback(
    async (peer: Peer) => {
      const choice = await confirm({
        title: `Delete '${peer.name}'?`,
        description:
          "Are you sure you want to delete this peer? This action cannot be undone.",
        confirmText: "Delete",
        cancelText: "Cancel",
        type: "danger",
      });
      if (!choice) return;
      notify({
        title: peer.name,
        description: "Peer was successfully deleted",
        loadingMessage: "Deleting peer...",
        promise: peerRequest.del({}, `/${peer.id}`).then(() => {
          mutate("/peers");
          mutate("/groups");
          removeNodeWithEdges(nodeId);
        }),
      });
    },
    [confirm, peerRequest, removeNodeWithEdges, nodeId],
  );

  // "Details" for peers (live AND draft): opens the peer's groups panel —
  // the same panel a left-click opens. Placeholders included: their group
  // assignments become the setup key's auto-groups.
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
          label: "View Details",
          icon: <EyeIcon size={14} />,
          onClick: () => {
            setSelectedDestinationGroup("");
            setSelectedPeerPanel(peerId);
          },
        },
      ];
      // Existing peers rename through the peers page's Edit Peer Name modal
      // (a real PUT — peer names aren't draft-managed). Placeholders keep
      // their canvas-only rename.
      const realPeer = (n.data as { peer?: Peer })?.peer;
      if (realPeer?.id && permission.peers.update) {
        items.push({
          label: "Rename",
          icon: <PencilLineIcon size={14} />,
          onClick: () => setPeerRenameTarget(realPeer),
        });
      }
      // Live only: delete the peer from the account (DELETE /peers/{id}).
      // Draft mode manages peers on the canvas (Remove), never a real delete.
      if (!isDraft && realPeer?.id && permission.peers.delete) {
        items.push({
          label: "Delete",
          icon: <TrashIcon size={14} />,
          danger: true,
          onClick: () => void handleLiveDeletePeer(realPeer),
        });
      }
      return items;
    },
    [
      setSelectedDestinationGroup,
      setSelectedPeerPanel,
      permission,
      isDraft,
      handleLiveDeletePeer,
    ],
  );

  // Renames an existing peer (PUT, same payload shape as the peer page) and
  // patches every canvas node carrying it so the rename shows immediately.
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

  // ---- Live group actions (rename / delete) — like the live policy
  // actions, every one confirms first since it hits the real account. ----

  const handleLiveRenameGroup = useCallback(
    async (target: Node) => {
      const group = getNodeGroup(target);
      if (!group?.id) return;
      const choice = await confirm({
        title: `Rename group “${group.name}”?`,
        description:
          "You are in live mode. Saving your changes will apply them to your account immediately.",
        confirmText: "Rename",
        cancelText: "Cancel",
        type: "warning",
        dismissOnOutsideClick: true,
      });
      if (!choice) return;
      openRename(target);
    },
    [confirm, openRename],
  );

  // The actual PUT once the rename modal saves (live mode only).
  const liveRenameGroup = useCallback(
    async (target: Node, name: string) => {
      const groupId = getNodeGroup(target)?.id;
      const group = groups?.find((g) => g.id === groupId);
      if (!group?.id) return;
      const toIds = (list?: (string | { id?: string })[]) =>
        (list ?? []).map((x) => (typeof x === "string" ? x : x.id ?? ""));
      await groupRequest.put(
        {
          name,
          peers: toIds(group.peers),
          resources: toIds(group.resources as (string | { id?: string })[]),
        },
        `/${group.id}`,
      );
      // Canvas nodes carry the group in their data — patch the name in
      // place so the rename shows without a view rebuild.
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

  // ---- Menu items ----

  const items: MenuItem[] = useMemo(() => {
    if (!node) return [];

    // Live mode: policy, group, resource and network-frame nodes get a menu
    // (see onNodeContextMenu). Actions act on the real account immediately
    // (behind confirmations) — live changes never deploy via the changeset.
    if (!isDraft) {
      if (node.type === "policyNode") {
        if (!nodePolicy?.id) return [];
        const enabled = livePolicy?.enabled ?? true;
        const items: MenuItem[] = [...focusItems(node)];
        if (permission.policies.update) {
          items.push(
            {
              label: "Edit",
              icon: <SquarePenIcon size={14} />,
              onClick: () => void handleLiveEditPolicy(),
            },
            {
              label: enabled ? "Disable" : "Enable",
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
            label: "Delete",
            icon: <TrashIcon size={14} />,
            danger: true,
            onClick: () => void handleLiveDeletePolicy(),
          });
        }
        return items;
      }
      // Groups: panel + rename/delete (both behind live-mode warnings, like
      // the policy actions). "All" is managed by the system.
      if (isGroupNode(node)) {
        const group = getNodeGroup(node);
        const items: MenuItem[] = [
          ...focusItems(node),
          {
            label: "View Details",
            icon: <EyeIcon size={14} />,
            onClick: () => setSelectedDestinationGroup(group?.id || node.id),
          },
        ];
        if (!isAllGroup(group) && canRenameGroup(group)) {
          items.push({
            label: "Rename",
            icon: <PencilLineIcon size={14} />,
            onClick: () => void handleLiveRenameGroup(node),
          });
        }
        return items;
      }
      // Resources: Edit + Disable/Enable (no Delete in live) — the same
      // confirmations as the other live actions.
      const isResourceNode =
        node.type === "resourceNode" ||
        node.type === "destinationResourceNode";
      if (isResourceNode && liveResourceOf(node)) {
        const resEnabled =
          ((node.data as { resource?: { enabled?: boolean } })?.resource
            ?.enabled ?? true) !== false;
        return [
          ...focusItems(node),
          {
            label: "Edit",
            icon: <SquarePenIcon size={14} />,
            onClick: () => void handleLiveEditResource(node),
          },
          {
            label: resEnabled ? "Disable" : "Enable",
            icon: resEnabled ? (
              <PowerOffIcon size={14} />
            ) : (
              <PowerIcon size={14} />
            ),
            onClick: () => void handleLiveToggleResource(node),
          },
        ];
      }
      // Network frames: live account actions — Add Resource / Routing Peer
      // create immediately against the API, Delete removes the network now.
      // (Passing the real `network` — not a networkNodeId — routes the
      // routing-peer modal to its live POST path.)
      if (node.type === "networkNode" && isFrameNode(node)) {
        const liveNetwork = (node.data as { network?: Network })?.network;
        if (!liveNetwork?.id) return [];
        const items: MenuItem[] = [
          {
            label: "View Details",
            icon: <EyeIcon size={14} />,
            onClick: () => handleViewNetworkDetails(node),
          },
          ...focusItems(node),
        ];
        if (permission.networks.update) {
          items.push(
            {
              label: "Add Resource",
              icon: <WorkflowIcon size={14} />,
              onClick: () => setResourceEditor({ createInNetworkNodeId: nodeId }),
            },
            {
              label: "Add Routing Peer",
              icon: <Share2Icon size={14} />,
              onClick: () => setRoutingPeerModal({ network: liveNetwork }),
            },
          );
        }
        if (permission.networks.delete) {
          items.push({
            label: "Delete",
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
        label: "Remove",
        icon: <CircleMinusIcon size={14} />,
        onClick: () => removeGroup(node),
      };
      // Opens the group panel (name/metadata + assign peers) — the same thing
      // a left-click on the node does; surfaced here so it's discoverable.
      const edit: MenuItem = {
        label: "View Details",
        icon: <EyeIcon size={14} />,
        onClick: () => setSelectedDestinationGroup(group?.id || node.id),
      };
      // "All" can neither be renamed nor deleted.
      if (isAllGroup(group)) return [...focus, edit, remove];

      const items: MenuItem[] = [...focus, edit];
      if (canRenameGroup(group)) {
        items.push({
          label: "Rename",
          icon: <PencilLineIcon size={14} />,
          onClick: () => openRename(node),
        });
      }
      items.push(remove);
      // Only offer Delete when the group can really be deleted (unused,
      // not IdP-issued, permitted) — matches the Groups page.
      if (!isNewGroup(group) && canDeleteGroup(group)) {
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
        ...focusItems(node),
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

    // Placeholder peers (Server / Agent / User Device) — canvas-only rename,
    // plus Details (group assignments become the setup key's auto-groups).
    // A user-device select node with a peer chosen is that peer already, so
    // it falls through to the plain Remove below.
    if (canRenamePeerNode(node)) {
      return [
        ...focusItems(node),
        ...peerDetailsItems(node),
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
        {
          label: "View Details",
          icon: <EyeIcon size={14} />,
          onClick: () => handleViewNetworkDetails(node),
        },
        ...focusItems(node),
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
          // Open the editor so an IP/CIDR/domain is entered; the row is
          // created into the frame only on save.
          onClick: () => setResourceEditor({ createInNetworkNodeId: nodeId }),
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
        // Draft networks Remove (cancels their pending create); existing ones
        // Delete (marked for deletion, removed from the account on deploy).
        draftNetwork
          ? {
              label: "Remove",
              icon: <CircleMinusIcon size={14} />,
              onClick: handleRemove,
            }
          : {
              label: "Delete",
              icon: <TrashIcon size={14} />,
              danger: true,
              onClick: () => deleteNetwork(nodeId),
            },
      ];
    }

    // Draft resource groups inside a frame: Rename / Remove. resourceGroupNode
    // isn't in GROUP_NODE_TYPES, so a folded existing group would otherwise fall
    // through to the remove-only default. New groups are always renameable;
    // folded existing ones follow canRenameGroup (IdP-issued groups can't).
    if (
      nodeId.startsWith("resourcegroup-new-") ||
      node.type === "resourceGroupNode"
    ) {
      const isNewResourceGroup = nodeId.startsWith("resourcegroup-new-");
      const items: MenuItem[] = [];
      if (isNewResourceGroup || canRenameGroup(getNodeGroup(node))) {
        items.push({
          label: "Rename",
          icon: <PencilLineIcon size={14} />,
          onClick: () => openRename(node),
        });
      }
      items.push({
        label: "Remove",
        icon: <CircleMinusIcon size={14} />,
        onClick: handleRemove,
      });
      return items;
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
        ...focusItems(node),
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
      ...focusItems(node),
      ...peerDetailsItems(node),
      {
        label: "Remove",
        icon: <CircleMinusIcon size={14} />,
        onClick: handleRemove,
      },
    ];
  }, [
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
    permission.policies.update,
    permission.policies.delete,
    permission.networks.update,
    permission.networks.delete,
    handleLiveEditPolicy,
    handleViewNetworkDetails,
    handleLiveTogglePolicy,
    handleLiveDeletePolicy,
    deleteNetwork,
    policyEnabled,
    handleRemove,
    removeGroup,
    setSelectedDestinationGroup,
    confirmAndDeleteGroups,
    canDeleteGroup,
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
          data-testid="cc-node-context-menu"
          className="fixed z-50 min-w-[180px] rounded-md border border-nb-gray-900 bg-nb-gray-940 p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
          style={{
            top: (menuPosition ?? position).y,
            left: (menuPosition ?? position).x,
          }}
        >
          {items.map((item, i) => (
            <React.Fragment key={item.label}>
              {/* Separate the destructive Delete action from the rest. */}
              {item.danger && i > 0 && !items[i - 1].danger && (
                <div className={"-mx-1 my-1 h-px bg-nb-gray-910"} />
              )}
              <button
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
            </React.Fragment>
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
            : groupTakenNames
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
            else if (!isDraft) void liveRenameGroup(renameTarget, name);
            else renameGroup(renameTarget, name);
          }
          setRenameOpen(false);
        }}
      />

      {/* Existing peers rename through the peers page's modal — a real PUT,
          not a draft change. */}
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
