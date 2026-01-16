import React from "react";
import { useGroupContext } from "@/contexts/GroupProvider";
import { DNSZone } from "@/interfaces/DNS";
import { DNSZonesProvider } from "@/modules/dns/zones/DNSZonesProvider";
import DNSZonesTable from "@/modules/dns/zones/table/DNSZonesTable";
import { GroupDetailsTableContainer } from "@/modules/groups/details/GroupDetailsTableContainer";

export const GroupDNSZonesSection = ({
  zones,
  isLoading = true,
}: {
  zones?: DNSZone[];
  isLoading?: boolean;
}) => {
  const { group } = useGroupContext();

  return (
    <GroupDetailsTableContainer>
      <DNSZonesProvider>
        <DNSZonesTable
          isGroupPage={true}
          isLoading={isLoading}
          data={zones}
          distributionGroups={[group]}
        />
      </DNSZonesProvider>
    </GroupDetailsTableContainer>
  );
};
