import React, { lazy } from "react";
import { useGroupContext } from "@/contexts/GroupProvider";
import { SetupKey } from "@/interfaces/SetupKey";
import { GroupDetailsTableContainer } from "@/modules/groups/details/GroupDetailsTableContainer";

const SetupKeysTable = lazy(
  () => import("@/modules/setup-keys/SetupKeysTable"),
);

type Props = {
  setupKeys?: SetupKey[];
  isLoading?: boolean;
};

export const GroupSetupKeysSection = ({
  setupKeys,
  isLoading = true,
}: Props) => {
  const { group } = useGroupContext();

  return (
    <GroupDetailsTableContainer>
      <SetupKeysTable
        isLoading={isLoading}
        setupKeys={setupKeys}
        isGroupPage={true}
        groups={[group]}
      />
    </GroupDetailsTableContainer>
  );
};
