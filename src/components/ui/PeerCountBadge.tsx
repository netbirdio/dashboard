import Badge, { BadgeVariants } from "@components/Badge";
import { cn, singularize } from "@utils/helpers";
import { MonitorSmartphoneIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMemo } from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { Group } from "@/interfaces/Group";
import ResourceCountBadge from "@components/ui/ResourceCountBadge";

type Props = {
  group?: Group;
} & React.HTMLAttributes<HTMLDivElement> &
  BadgeVariants;

export default function PeerCountBadge({
  group,
  variant = "gray",
  className,
}: Props) {
  const router = useRouter();
  const { dropdownOptions } = useGroups();

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

  const canRedirect = !!group?.id && group?.name !== "All";

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (canRedirect) router.push(`/group?id=${group?.id}&tab=peers`);
  };

  const resourcesCount = group?.resources_count ?? 0;
  const showResources = resourcesCount > 0 && peerCount === 0;

  return showResources ? (
    <ResourceCountBadge group={group} />
  ) : (
    <Badge
      variant={variant}
      className={cn(
        className,
        "px-3 gap-2 whitespace-nowrap",
        canRedirect && "cursor-pointer",
      )}
      onClick={onClick}
      useHover={canRedirect}
    >
      <MonitorSmartphoneIcon size={12} />
      {singularize("Peers", peerCount, true)}
    </Badge>
  );
}
