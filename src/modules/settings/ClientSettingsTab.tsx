import Breadcrumbs from "@components/Breadcrumbs";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import InlineLink from "@components/InlineLink";
import { notify } from "@components/Notification";
import * as Tabs from "@radix-ui/react-tabs";
import { useApiCall } from "@utils/api";
import {
  ClockFadingIcon,
  ExternalLinkIcon,
  FlaskConicalIcon,
  MonitorSmartphoneIcon,
} from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Account } from "@/interfaces/Account";

type Props = {
  account: Account;
};

export default function ClientSettingsTab({ account }: Readonly<Props>) {
  const { permission } = usePermissions();

  const { mutate } = useSWRConfig();
  const saveRequest = useApiCall<Account>("/accounts/" + account.id, true);

  const [lazyConnection, setLazyConnection] = useState(
    account.settings?.lazy_connection_enabled ?? false,
  );

  const toggleLazyConnection = async (toggle: boolean) => {
    notify({
      title: "Lazy Connections",
      description: `Lazy Connections successfully ${
        toggle ? "enabled" : "disabled"
      }.`,
      promise: saveRequest
        .put({
          id: account.id,
          settings: {
            ...account.settings,
            lazy_connection_enabled: toggle,
          },
        })
        .then(() => {
          setLazyConnection(toggle);
          mutate("/accounts");
        }),
      loadingMessage: "Updating Lazy Connections setting...",
    });
  };

  return (
    <Tabs.Content value={"clients"}>
      <div className={"p-default py-6 max-w-xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={"Settings"}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings?tab=clients"}
            label={"Clients"}
            icon={<MonitorSmartphoneIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <div className={"flex items-start justify-between"}>
          <h1>Clients</h1>
        </div>

        <div className={"flex flex-col gap-6 w-full mt-8"}>
          <div className={"mt-0"}>
            <h2 className={"text-lg font-medium"}>
              Experimental
              <FlaskConicalIcon
                size={16}
                className={"inline ml-1.5 relative -top-[2px]"}
              />
            </h2>
            <div className={"text-sm text-gray-400"}>
              Lazy connections are an experimental feature. Functionality and
              behavior may evolve. Instead of maintaining always-on connections,
              NetBird activates them on-demand based on activity or signaling.{" "}
              <InlineLink
                href={"https://docs.netbird.io/how-to/lazy-connection"}
                target={"_blank"}
              >
                Learn more
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </div>
          </div>
          <FancyToggleSwitch
            value={lazyConnection}
            onChange={toggleLazyConnection}
            label={
              <>
                <ClockFadingIcon size={15} />
                Enable Lazy Connections
              </>
            }
            helpText={
              <>
                Allow to establish connections between peers only when required.
                This requires NetBird client v0.45 or higher. Changes will only
                take effect after restarting the clients.
              </>
            }
            disabled={!permission.settings.update}
          />
        </div>
      </div>
    </Tabs.Content>
  );
}
