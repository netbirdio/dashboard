import React, { lazy } from "react";
import PoliciesProvider from "@/contexts/PoliciesProvider";
import { Policy } from "@/interfaces/Policy";
import { GroupDetailsTableContainer } from "@/modules/groups/details/GroupDetailsTableContainer";

const AccessControlTable = lazy(
  () => import("@/modules/access-control/table/AccessControlTable"),
);
type Props = {
  policies?: Policy[];
  isLoading?: boolean;
};

export const GroupPoliciesSection = ({ policies, isLoading = true }: Props) => {
  return (
    <GroupDetailsTableContainer>
      <PoliciesProvider>
        <AccessControlTable
          isLoading={isLoading}
          policies={policies}
          isGroupPage={true}
        />
      </PoliciesProvider>
    </GroupDetailsTableContainer>
  );
};
