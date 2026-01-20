import React from "react";
import { useGroupContext } from "@/contexts/GroupProvider";
import { Route } from "@/interfaces/Route";
import { GroupDetailsTableContainer } from "@/modules/groups/details/GroupDetailsTableContainer";
import NetworkRoutesTable from "@/modules/route-group/NetworkRoutesTable";
import useGroupedRoutes from "@/modules/route-group/useGroupedRoutes";

type Props = {
  routes?: Route[];
  isLoading?: boolean;
};

export const GroupNetworkRoutesSection = ({
  routes,
  isLoading = true,
}: Props) => {
  const groupedRoutes = useGroupedRoutes({ routes });
  const { group } = useGroupContext();

  return (
    <GroupDetailsTableContainer>
      <NetworkRoutesTable
        isGroupPage={true}
        isLoading={isLoading}
        groupedRoutes={groupedRoutes}
        routes={routes}
        distributionGroups={[group]}
      />
    </GroupDetailsTableContainer>
  );
};
