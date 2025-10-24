import React, { lazy } from "react";
import PoliciesProvider from "@/contexts/PoliciesProvider";
import { GroupDetailsTableContainer } from "@/modules/groups/details/GroupDetailsTableContainer";
import { GroupPolices } from "@/modules/groups/details/useGroupDetails";

const AccessControlTable = lazy(
  () => import("@/modules/access-control/table/AccessControlTable"),
);

export const GroupPoliciesSection = ({
  policies,
}: {
  policies?: GroupPolices;
}) => {
  return (
    <GroupDetailsTableContainer>
      <PoliciesProvider>
        <AccessControlTable
          isLoading={false}
          policies={policies?.all}
          isGroupPage={true}
        />
      </PoliciesProvider>
    </GroupDetailsTableContainer>
  );
};
