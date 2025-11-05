import React, { lazy } from "react";
import PoliciesProvider from "@/contexts/PoliciesProvider";
import { Policy } from "@/interfaces/Policy";
import { GroupDetailsTableContainer } from "@/modules/groups/details/GroupDetailsTableContainer";

const AccessControlTable = lazy(
  () => import("@/modules/access-control/table/AccessControlTable"),
);

export const GroupPoliciesSection = ({ policies }: { policies?: Policy[] }) => {
  return (
    <GroupDetailsTableContainer>
      <PoliciesProvider>
        <AccessControlTable
          isLoading={false}
          policies={policies}
          isGroupPage={true}
        />
      </PoliciesProvider>
    </GroupDetailsTableContainer>
  );
};
