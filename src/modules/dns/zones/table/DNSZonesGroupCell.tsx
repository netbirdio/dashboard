import * as React from "react";
import { useMemo, useState } from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { DNSZone } from "@/interfaces/DNS";
import { Group } from "@/interfaces/Group";
import EmptyRow from "@/modules/common-table-rows/EmptyRow";
import GroupsRow from "@/modules/common-table-rows/GroupsRow";
import { useDNSZones } from "@/modules/dns/zones/DNSZonesProvider";

type Props = {
  zone: DNSZone;
};

export const DNSZonesGroupCell = ({ zone }: Props) => {
  const { groups } = useGroups();
  const { updateZone } = useDNSZones();
  const [modal, setModal] = useState(false);
  const { permission } = usePermissions();

  const allGroups = zone?.distribution_groups
    .map((group) => {
      return groups?.find((g) => g.id == group);
    })
    .filter((g) => g != undefined) as Group[];

  const groupIDs = useMemo(() => {
    return allGroups
      ?.map((group) => group.id)
      .filter((id) => id !== undefined) as string[];
  }, [allGroups]);

  const handleSave = async (promises: Promise<Group>[]) => {
    const groups = await Promise.all(promises);
    const groupIds = groups?.map((g) => g.id as string);
    await updateZone({
      ...zone,
      distribution_groups: groupIds,
    }).then(() => {
      setModal(false);
    });
  };

  if (!zone?.distribution_groups) return <EmptyRow />;

  return (
    <GroupsRow
      label={"Distribution Groups"}
      description={
        "Advertise this zone to peers that belong to the following groups"
      }
      groups={groupIDs || []}
      hideAllGroup={false}
      disabled={!permission?.dns?.update}
      onSave={handleSave}
      modal={modal}
      setModal={setModal}
    />
  );
};
