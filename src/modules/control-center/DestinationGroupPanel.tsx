import { cn } from "@utils/helpers";
import { CheckIcon, PencilIcon, XIcon } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { trim } from "lodash";
import { ScrollArea } from "@components/ScrollArea";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { SmallBadge } from "@components/ui/SmallBadge";
import { Input } from "@components/Input";
import { Group } from "@/interfaces/Group";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import {
  getGroupPeers,
  getGroupResources,
} from "@/modules/control-center/utils/graph-builder";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";
import { useStructuralNodes } from "@/modules/control-center/utils/helpers";
import { useDraftMode } from "@/modules/control-center/draft/DraftModeContext";
import {
  canRenameGroup,
  getNodeGroup,
  isGroupNode,
  isNewGroup,
  useDraftGroupActions,
} from "@/modules/control-center/hooks/useDraftGroupActions";

interface DestinationGroupPanelProps {
  // Real group id, or — for draft groups without an API id — the canvas node id.
  groupId: string;
  onClose: () => void;
}

export const DestinationGroupPanel = ({
  groupId,
  onClose,
}: DestinationGroupPanelProps) => {
  const { peers, networkResources, groups } = useControlCenterData();
  // Structural subscription — the panel derives from node data only, and a
  // context nodes subscription re-rendered it (and its member lists) on
  // every canvas update while open.
  const nodes = useStructuralNodes();
  const { isDraft } = useDraftMode();
  const { renameGroup } = useDraftGroupActions();

  // In draft the canvas node is the source of truth (it carries renames and
  // drag-added members); the API group is the live-mode fallback. A group can
  // exist on the canvas more than once (source node + destination copy).
  const groupNodes = useMemo(
    () =>
      nodes.filter(
        (n) =>
          isGroupNode(n) &&
          (n.id === groupId || getNodeGroup(n)?.id === groupId),
      ),
    [nodes, groupId],
  );
  const groupNode = groupNodes[0];

  const group: Group | undefined = useMemo(() => {
    if (isDraft && groupNode) return getNodeGroup(groupNode);
    return (
      groups?.find((g) => g.id === groupId) ?? getNodeGroup(groupNode)
    );
  }, [isDraft, groupNode, groups, groupId]);

  const isNew = isNewGroup(group);
  const realGroupId = group?.id ?? "";

  // Draft-added members live on the canvas nodes, not in the API data yet.
  const addedMembers = useMemo(() => {
    const added = new Set<string>();
    groupNodes.forEach((n) => {
      const members = n.data?.addedMembers as Set<string> | undefined;
      members?.forEach((id) => added.add(id));
    });
    return added;
  }, [groupNodes]);

  const groupPeers = useMemo(() => {
    if (!peers) return [];
    const existing = realGroupId ? getGroupPeers(peers, realGroupId) : [];
    const addedPeers = peers.filter(
      (p) =>
        p.id && addedMembers.has(p.id) && !existing.some((e) => e.id === p.id),
    );
    return [...existing, ...addedPeers];
  }, [peers, realGroupId, addedMembers]);

  const resources = useMemo(() => {
    if (!networkResources) return [];
    const existing = realGroupId
      ? getGroupResources(networkResources, realGroupId)
      : [];
    const addedResources = networkResources.filter(
      (r) => addedMembers.has(r.id) && !existing.some((e) => e.id === r.id),
    );
    return [...existing, ...addedResources];
  }, [networkResources, realGroupId, addedMembers]);

  const countLabel = useMemo(() => {
    const parts = [];
    if (groupPeers.length > 0)
      parts.push(`${groupPeers.length} Peer${groupPeers.length !== 1 ? "s" : ""}`);
    if (resources.length > 0)
      parts.push(`${resources.length} Resource${resources.length !== 1 ? "s" : ""}`);
    return parts.join(", ");
  }, [groupPeers.length, resources.length]);

  // ---- Rename (draft only) ----

  const canRename = isDraft && !!groupNode && canRenameGroup(group);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group?.name ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    setEditing(false);
    setName(group?.name ?? "");
    setError("");
  }, [groupId, group?.name]);

  const takenNames = useMemo(() => {
    const taken = new Set<string>();
    groups?.forEach((g) => taken.add(g.name));
    nodes.forEach((n) => {
      const g = getNodeGroup(n);
      if (g?.name) taken.add(g.name);
    });
    taken.delete(group?.name ?? "");
    return taken;
  }, [groups, nodes, group?.name]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setError(
      takenNames.has(trim(value))
        ? "This group already exists. Please choose another name."
        : "",
    );
    setName(value);
  };

  const saveRename = () => {
    const trimmed = trim(name);
    if (!groupNode || error || trimmed.length === 0) return;
    if (trimmed !== group?.name) renameGroup(groupNode, trimmed);
    setEditing(false);
  };

  return (
    <div
      className={cn(
        "absolute right-6 top-[76px] bottom-5 z-20",
        "border border-nb-gray-900 rounded-lg w-[320px] flex flex-col",
        "bg-nb-gray-940/95 backdrop-blur-sm shadow-xl",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-nb-gray-900">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-9 w-9 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0">
            <GroupBadgeIcon id={group?.id} issued={group?.issued} size={14} />
          </div>
          {editing ? (
            <div className="flex-1 min-w-0">
              <Input
                value={name}
                onChange={handleNameChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveRename();
                  if (e.key === "Escape") setEditing(false);
                }}
                error={error}
                errorTooltip={true}
                className="h-[34px] text-sm"
                autoFocus
              />
            </div>
          ) : (
            <div className="min-w-0">
              <div className="text-sm font-normal text-nb-gray-200 truncate flex items-center gap-2">
                {group?.name || "Unknown Group"}
                {isNew && <SmallBadge />}
              </div>
              {countLabel && (
                <div className="text-xs text-nb-gray-400">{countLabel}</div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {canRename && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="p-1 rounded hover:bg-nb-gray-800 text-nb-gray-400 hover:text-nb-gray-200 transition-colors"
              aria-label="Rename group"
            >
              <PencilIcon size={14} />
            </button>
          )}
          {editing && (
            <button
              onClick={saveRename}
              className="p-1 rounded hover:bg-nb-gray-800 text-nb-gray-400 hover:text-nb-gray-200 transition-colors"
              aria-label="Save group name"
            >
              <CheckIcon size={16} />
            </button>
          )}
          <button
            onClick={editing ? () => setEditing(false) : onClose}
            className="p-1 rounded hover:bg-nb-gray-800 text-nb-gray-400 hover:text-nb-gray-200 transition-colors"
          >
            <XIcon size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-3 py-3 flex flex-col gap-4">
          {groupPeers.length > 0 && (
            <div>
              <div className="text-xs font-medium text-nb-gray-400 uppercase tracking-wider px-1 mb-2">
                Peers
              </div>
              <div className="flex flex-col gap-1">
                {groupPeers.map((peer) => (
                  <div
                    key={peer.id}
                    className="rounded-md border border-nb-gray-910 bg-nb-gray-930/50 py-1.5 px-1 hover:bg-nb-gray-900/50 transition-colors"
                  >
                    <DeviceCard device={peer} size="small" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {resources.length > 0 && (
            <div>
              <div className="text-xs font-medium text-nb-gray-400 uppercase tracking-wider px-1 mb-2">
                Resources
              </div>
              <div className="flex flex-col gap-1">
                {resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="rounded-md border border-nb-gray-910 bg-nb-gray-930/50 py-1.5 px-1 hover:bg-nb-gray-900/50 transition-colors"
                  >
                    <DeviceCard resource={resource} size="small" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {groupPeers.length === 0 && resources.length === 0 && (
            <div className="text-sm text-nb-gray-400 text-center py-8">
              No peers or resources in this group
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
