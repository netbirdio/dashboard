import { usePortalElement } from "@hooks/usePortalElement";
import React, { lazy } from "react";
import { useGroupContext } from "@/contexts/GroupProvider";
import { NameserverGroup } from "@/interfaces/Nameserver";
import { GroupDetailsTableContainer } from "@/modules/groups/details/GroupDetailsTableContainer";

const NameserverGroupTable = lazy(
  () => import("@/modules/dns-nameservers/table/NameserverGroupTable"),
);

export const GroupNameserversSection = ({
  nameserverGroups,
}: {
  nameserverGroups?: NameserverGroup[];
}) => {
  const { group } = useGroupContext();

  return (
    <GroupDetailsTableContainer>
      <NameserverGroupTable
        isLoading={false}
        nameserverGroups={nameserverGroups}
        isGroupPage={true}
        distributionGroups={[group]}
      />
    </GroupDetailsTableContainer>
  );
};
