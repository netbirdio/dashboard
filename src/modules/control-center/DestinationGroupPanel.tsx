import { cn } from "@utils/helpers";
import { XIcon } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { ScrollArea } from "@components/ScrollArea";
import { GroupBadgeIcon } from "@components/ui/GroupBadgeIcon";
import { DeviceCard } from "@/modules/control-center/nodes/DeviceCard";
import {
  getGroupPeers,
  getGroupResources,
} from "@/modules/control-center/utils/graph-builder";
import { useControlCenterData } from "@/modules/control-center/hooks/useControlCenterData";

interface DestinationGroupPanelProps {
  groupId: string;
  onClose: () => void;
}

export const DestinationGroupPanel = ({
  groupId,
  onClose,
}: DestinationGroupPanelProps) => {
  const { peers, networkResources, groups } = useControlCenterData();

  const group = useMemo(
    () => groups?.find((g) => g.id === groupId),
    [groups, groupId],
  );

  const groupPeers = useMemo(
    () => (peers ? getGroupPeers(peers, groupId) : []),
    [peers, groupId],
  );

  const resources = useMemo(
    () => (networkResources ? getGroupResources(networkResources, groupId) : []),
    [networkResources, groupId],
  );

  const countLabel = useMemo(() => {
    const parts = [];
    if (groupPeers.length > 0)
      parts.push(`${groupPeers.length} Peer${groupPeers.length !== 1 ? "s" : ""}`);
    if (resources.length > 0)
      parts.push(`${resources.length} Resource${resources.length !== 1 ? "s" : ""}`);
    return parts.join(", ");
  }, [groupPeers.length, resources.length]);

  return (
    <div
      className={cn(
        "absolute right-6 top-[72px] bottom-[64px] z-20",
        "border border-nb-gray-900 rounded-lg w-[320px] flex flex-col",
        "bg-nb-gray-940/95 backdrop-blur-sm shadow-xl",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-nb-gray-900">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0">
            <GroupBadgeIcon id={group?.id} issued={group?.issued} size={14} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-normal text-nb-gray-200 truncate">
              {group?.name || "Unknown Group"}
            </div>
            {countLabel && (
              <div className="text-xs text-nb-gray-400">{countLabel}</div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-nb-gray-800 text-nb-gray-400 hover:text-nb-gray-200 transition-colors shrink-0"
        >
          <XIcon size={16} />
        </button>
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
