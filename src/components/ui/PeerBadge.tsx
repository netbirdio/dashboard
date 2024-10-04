import Badge, { BadgeVariants } from "@components/Badge";
import { cn } from "@utils/helpers";
import { EyeIcon, MonitorSmartphoneIcon, SquarePen } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { Group } from "@/interfaces/Group";
import { AssignPeerToGroupModal } from "@/modules/groups/AssignPeerToGroupModal";

type Props = {
  children?: React.ReactNode;
  group?: Group;
  useSave?: boolean;
  onAssignmentChange?: (group: Group) => void;
} & React.HTMLAttributes<HTMLDivElement> &
  BadgeVariants;
export default function PeerBadge({
  children,
  group,
  variant = "gray",
  className,
  useSave = true,
  onAssignmentChange,
}: Props) {
  const [editGroupPeersModal, setEditGroupPeersModal] = useState(false);

  const { dropdownOptions, addDropdownOptions } = useGroups();

  const currentGroup = useMemo(() => {
    return dropdownOptions?.find((g) => g.name === group?.name);
  }, [group, dropdownOptions]);

  const peerCount = useMemo(() => {
    let peerCount = currentGroup?.peers_count ?? 0;
    let countedPeers = currentGroup?.peers?.length ?? 0;
    if (peerCount !== countedPeers) {
      peerCount = countedPeers;
    }
    return peerCount;
  }, [currentGroup]);

  const updateGroupOptions = (g: Group) => {
    addDropdownOptions([g]);
    onAssignmentChange && onAssignmentChange(g);
  };

  return (
    <>
      {currentGroup && editGroupPeersModal && (
        <AssignPeerToGroupModal
          useSave={useSave}
          group={currentGroup}
          onUpdate={(g) => updateGroupOptions(g)}
          open={editGroupPeersModal}
          setOpen={setEditGroupPeersModal}
        />
      )}

      <Badge
        variant={variant}
        className={cn(className, "px-3 gap-2 whitespace-nowrap")}
        onClick={(e) => {
          if (!currentGroup) return;
          e.stopPropagation();
          setEditGroupPeersModal(true);
        }}
        useHover={!!currentGroup}
      >
        {!currentGroup && <MonitorSmartphoneIcon size={12} />}
        {currentGroup ? <>{peerCount} Peer(s)</> : children}

        {currentGroup && (
          <>
            {currentGroup.name == "All" ? (
              <EyeIcon size={12} />
            ) : (
              <SquarePen size={12} />
            )}
          </>
        )}
      </Badge>
    </>
  );
}
