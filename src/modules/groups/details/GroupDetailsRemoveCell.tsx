import { MinusCircle } from "lucide-react";
import * as React from "react";
import Button from "@/components/Button";
import { useGroupContext } from "@/contexts/GroupProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Peer } from "@/interfaces/Peer";
import { User } from "@/interfaces/User";

type Props = {
  onRemove: () => void;
};

export function GroupDetailsRemoveCell({ onRemove }: Props) {
  const t = useTranslations();
  return (
    <div className={"flex justify-end pr-4"}>
      <Button
        variant={"default-outline"}
        size={"sm"}
        onClick={() => onRemove()}
      >
        <MinusCircle size={14} />
        {t("common.remove")}
      </Button>
    </div>
  );
}

export const GroupPeersRemoveCell = ({ peer }: { peer: Peer }) => {
  const { removePeersFromGroup } = useGroupContext();
  const { permission } = usePermissions();
  return (
    permission?.peers?.update &&
    permission?.groups?.update && (
      <GroupDetailsRemoveCell onRemove={() => removePeersFromGroup([peer])} />
    )
  );
};

export const GroupUsersRemoveCell = ({ user }: { user: User }) => {
  const { removeUsersFromGroup } = useGroupContext();
  const { permission } = usePermissions();
  return (
    permission?.users?.update && (
      <GroupDetailsRemoveCell onRemove={() => removeUsersFromGroup([user])} />
    )
  );
};
