import Breadcrumbs from "@components/Breadcrumbs";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import { notify } from "@components/Notification";
import * as Tabs from "@radix-ui/react-tabs";
import { useApiCall } from "@utils/api";
import { GlobeIcon, NetworkIcon } from "lucide-react";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { Account } from "@/interfaces/Account";

type Props = {
  account: Account;
};

export default function NetworkSettingsTab({ account }: Props) {
  const { mutate } = useSWRConfig();
  const saveRequest = useApiCall<Account>("/accounts/" + account.id);

  const [routingPeerDNSSetting, setRoutingPeerDNSSetting] = useState(
    account.settings.routing_peer_dns_resolution_enabled,
  );

  const toggleSetting = async (toggle: boolean) => {
    notify({
      title: "Save Network Settings",
      description: "Network settings successfully saved.",
      promise: saveRequest
        .put({
          id: account.id,
          settings: {
            ...account.settings,
            routing_peer_dns_resolution_enabled: toggle,
          },
        })
        .then(() => {
          setRoutingPeerDNSSetting(toggle);
          mutate("/accounts");
        }),
      loadingMessage: "Saving the network settings...",
    });
  };

  return (
    <Tabs.Content value={"networks"}>
      <div className={"p-default py-6 max-w-2xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={"Settings"}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings#network"}
            label={"Network"}
            icon={<NetworkIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <div className={"flex items-start justify-between"}>
          <h1>Networks</h1>
        </div>

        <div className={"flex flex-col gap-6 w-full mt-8"}>
          <div>
            <FancyToggleSwitch
              value={routingPeerDNSSetting}
              onChange={toggleSetting}
              label={
                <>
                  <GlobeIcon size={15} />
                  Enable DNS Wildcard Routing
                </>
              }
              helpText={
                <>
                  Allow routing using DNS wildcards. This requires NetBird
                  client v0.35 or higher. Changes will only take effect after
                  restarting the clients.
                </>
              }
            />
          </div>
        </div>
      </div>
    </Tabs.Content>
  );
}
