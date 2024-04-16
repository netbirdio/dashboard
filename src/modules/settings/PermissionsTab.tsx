import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import { notify } from "@components/Notification";
import * as Tabs from "@radix-ui/react-tabs";
import { useApiCall } from "@utils/api";
import { GaugeIcon, LockIcon } from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { useHasChanges } from "@/hooks/useHasChanges";
import { Account } from "@/interfaces/Account";

type Props = {
  account: Account;
};

export default function PermissionsTab({ account }: Props) {
  const { mutate } = useSWRConfig();
  const saveRequest = useApiCall<Account>("/accounts/" + account.id);

  const [userViewBlocked, setUserViewBlocked] = useState<boolean>(
    account?.settings.regular_users_view_blocked ?? false,
  );

  const { hasChanges, updateRef } = useHasChanges([userViewBlocked]);

  const saveChanges = async () => {
    notify({
      title: "Permission Settings",
      description: "Permissions were updated successfully.",
      promise: saveRequest
        .put({
          id: account.id,
          settings: {
            regular_users_view_blocked: userViewBlocked,
            groups_propagation_enabled:
              account.settings?.groups_propagation_enabled,
            peer_login_expiration_enabled:
              account.settings?.peer_login_expiration_enabled,
            peer_login_expiration: account.settings?.peer_login_expiration,
            jwt_groups_enabled: account.settings?.jwt_groups_enabled,
            jwt_groups_claim_name: account.settings?.jwt_groups_claim_name,
            jwt_allow_groups: account.settings?.jwt_allow_groups,
          },
        })
        .then(() => {
          mutate("/accounts");
          updateRef([userViewBlocked]);
        }),
      loadingMessage: "Updating permissions...",
    });
  };

  return (
    <Tabs.Content value={"permissions"} className={"w-full"}>
      <div className={"p-default py-6 max-w-xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={"Settings"}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings?tab=permissions"}
            label={"Permissions"}
            icon={<LockIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <div className={"flex items-start justify-between"}>
          <h1>Permissions</h1>
          <Button
            variant={"primary"}
            disabled={!hasChanges}
            onClick={saveChanges}
          >
            Save Changes
          </Button>
        </div>

        <div className={"flex flex-col gap-6 mt-8 mb-3"}>
          <FancyToggleSwitch
            value={userViewBlocked}
            onChange={setUserViewBlocked}
            label={
              <>
                <GaugeIcon size={15} />
                Restrict dashboard for regular users
              </>
            }
            helpText={
              "Access to the dashboard will be limited and regular users will not be able to view any peers."
            }
          />
        </div>
      </div>
    </Tabs.Content>
  );
}
