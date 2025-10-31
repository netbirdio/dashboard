import React, { lazy } from "react";
import { useGroupContext } from "@/contexts/GroupProvider";
import { SetupKey } from "@/interfaces/SetupKey";
import { GroupDetailsTableContainer } from "@/modules/groups/details/GroupDetailsTableContainer";

const SetupKeysTable = lazy(
  () => import("@/modules/setup-keys/SetupKeysTable"),
);

export const GroupSetupKeysSection = ({
  setupKeys,
}: {
  setupKeys?: SetupKey[];
}) => {
  const { group } = useGroupContext();

  return (
    <GroupDetailsTableContainer>
      <SetupKeysTable
        isLoading={false}
        setupKeys={setupKeys}
        isGroupPage={true}
        groups={[group]}
      />
    </GroupDetailsTableContainer>
  );
};
