import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CircleXIcon,
  ListIcon,
  WorkflowIcon,
  PencilLineIcon,
  PlusIcon,
  SquarePenIcon,
  PowerIcon,
  PowerOffIcon,
  TrashIcon,
} from "lucide-react";
import { Node } from "@xyflow/react";
import { cn } from "@utils/helpers";
import { Policy } from "@/interfaces/Policy";
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
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { GroupRenameModal } from "@/modules/control-center/draft/GroupRenameModal";
import { useEdgeAwareMenuPosition } from "@/modules/control-center/hooks/useEdgeAwareMenuPosition";
import {
  getPlaceholderPeer,
  PLACEHOLDER_BASE_NAMES,
} from "@/modules/control-center/utils/helpers";
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
  onClose: () => void;
}

export const NodeContextMenu = ({
  position,
  nodeId,
  onClose,
}: NodeContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  // Where the menu renders — flipped/clamped away from the viewport edges.
  const menuPosition = useEdgeAwareMenuPosition(position, menuRef);
  const { nodes, setNodes, setEdges, setSelectedDestinationGroup } =
    useCanvasState();
  const { isDraft, setResourceEditor, setRoutingPeerModal, setNetworkEditor } =
    useDraftMode();
  const { setSelectedPolicy, setPolicyModalOpen } = useControlCenterPolicy();
  const { groups, policies } = useControlCenterData();
  const { trackSetPolicyEnabled, trackDeletePolicy } = useDraftChangeset();
  const {
    renameGroup,
    removeGroup,
    confirmAndDeleteGroups,
    removeNodeWithEdges,
  } = useDraftGroupActions();
  const { addResourceToFrame, addResourceGroupToFrame } = useDraftNodeCreation();

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

  const handleDeletePolicy = useCallback(() => {
    if (!nodePolicy) return;
    trackDeletePolicy({
      policyId: policyClientId,
      name: nodePolicy.name ?? "Policy",
    });
    removeNodeWithEdges(nodeId);
  }, [
    nodePolicy,
    policyClientId,
    nodeId,
    trackDeletePolicy,
    removeNodeWithEdges,
  ]);

  // ---- Menu items ----

  const items: MenuItem[] = useMemo(() => {
    // Live mode keeps the simple canvas-only actions.
    if (!isDraft || !node) {
      return [
        {
          label: "Remove",
          icon: <CircleXIcon size={14} />,
          onClick: handleRemove,
        },
      ];
    }

    if (isGroupNode(node)) {
      const group = getNodeGroup(node);
      const remove: MenuItem = {
        label: "Remove",
        icon: <CircleXIcon size={14} />,
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
        // Draft-created policies only exist on the canvas — taking them off
        // is a Remove (drops the pending create). Delete is reserved for
        // policies that exist in the API and will really be deleted.
        nodeId.startsWith("policy-new-")
          ? {
              label: "Remove",
              icon: <CircleXIcon size={14} />,
              onClick: handleDeletePolicy,
            }
          : {
              label: "Delete",
              icon: <TrashIcon size={14} />,
              onClick: handleDeletePolicy,
              danger: true,
            },
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
          icon: <CircleXIcon size={14} />,
          onClick: handleRemove,
        },
      ];
    }

    // Draft networks: Edit (networks page's modal — name + description) /
    // Add Routing Peer / Remove (removal cascades to dependent
    // resource/router changes).
    if (node.type === "networkNode" && !(node.data as any)?.network?.id) {
      return [
        {
          label: "Edit",
          icon: <SquarePenIcon size={14} />,
          onClick: () => setNetworkEditor({ networkNodeId: nodeId }),
        },
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
          icon: <PlusIcon size={14} />,
          onClick: () => setRoutingPeerModal({ networkNodeId: nodeId }),
        },
        {
          label: "Remove",
          icon: <CircleXIcon size={14} />,
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
          icon: <CircleXIcon size={14} />,
          onClick: handleRemove,
        },
      ];
    }

    // Draft resources: Edit (reopens the editor) / Remove.
    if (nodeId.startsWith("resource-new-")) {
      return [
        {
          label: "Edit",
          icon: <SquarePenIcon size={14} />,
          onClick: () => setResourceEditor({ nodeId }),
        },
        {
          label: "Remove",
          icon: <CircleXIcon size={14} />,
          onClick: handleRemove,
        },
      ];
    }

    return [
      {
        label: "Remove",
        icon: <CircleXIcon size={14} />,
        onClick: handleRemove,
      },
    ];
  }, [
    isDraft,
    node,
    nodeId,
    policyEnabled,
    handleRemove,
    removeGroup,
    setSelectedDestinationGroup,
    confirmAndDeleteGroups,
    handleTogglePolicy,
    handleDeletePolicy,
    setRoutingPeerModal,
    setResourceEditor,
    setNetworkEditor,
    setSelectedPolicy,
    setPolicyModalOpen,
    openRename,
    addResourceToFrame,
    addResourceGroupToFrame,
  ]);

  useEffect(() => {
    if (!position) return;
    document.addEventListener("click", onClose);
    document.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("click", onClose);
      document.removeEventListener("scroll", onClose, true);
    };
  }, [position, onClose]);

  return (
    <>
      {position && (
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
              onClick={() => {
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
        title={isPlaceholderRename ? "Rename Peer" : undefined}
        description={
          isPlaceholderRename
            ? "Set an easily identifiable name for this peer."
            : undefined
        }
        inputPlaceholder={
          isPlaceholderRename ? "e.g., Backup Server" : undefined
        }
        currentName={
          isPlaceholderRename
            ? placeholderCurrentName
            : getNodeGroup(renameTarget ?? undefined)?.name ?? ""
        }
        groups={isPlaceholderRename ? undefined : groups}
        takenNames={isPlaceholderRename ? placeholderTakenNames : undefined}
        duplicateError={
          isPlaceholderRename
            ? "Name already taken. Please choose another name."
            : undefined
        }
        onRename={(name) => {
          if (renameTarget) {
            if (isPlaceholderRename) renamePlaceholder(renameTarget.id, name);
            else renameGroup(renameTarget, name);
          }
          setRenameOpen(false);
        }}
      />
    </>
  );
};
