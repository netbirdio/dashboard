import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import { useHasChanges } from "@hooks/useHasChanges";
import * as Tabs from "@radix-ui/react-tabs";
import { useApiCall } from "@utils/api";
import { validator } from "@utils/helpers";
import { isNetBirdHosted } from "@utils/netbird";
import cidr from "ip-cidr";
import { ExternalLinkIcon, GlobeIcon, NetworkIcon } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Account } from "@/interfaces/Account";

type Props = {
  account: Account;
};

export default function NetworkSettingsTab({ account }: Readonly<Props>) {
  const { permission } = usePermissions();

  const { mutate } = useSWRConfig();
  const saveRequest = useApiCall<Account>("/accounts/" + account.id, true);

  const [routingPeerDNSSetting, setRoutingPeerDNSSetting] = useState(
    account.settings.routing_peer_dns_resolution_enabled,
  );
  const [customDNSDomain, setCustomDNSDomain] = useState(
    account.settings.dns_domain || "",
  );
  const [networkRange, setNetworkRange] = useState(
    account.settings.network_range || "",
  );

  const toggleNetworkDNSSetting = async (toggle: boolean) => {
    notify({
      title: "DNS Wildcard Routing",
      description: `DNS Wildcard Routing successfully ${
        toggle ? "enabled" : "disabled"
      }.`,
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
      loadingMessage: "Updating DNS wildcard setting...",
    });
  };

  const { hasChanges, updateRef } = useHasChanges([
    customDNSDomain,
    networkRange,
  ]);

  const saveChanges = async () => {
    const updatedSettings = {
      ...account.settings,
    };

    if (customDNSDomain !== "" || account.settings.dns_domain) {
      updatedSettings.dns_domain = customDNSDomain;
    }

    if (networkRange !== "") {
      updatedSettings.network_range = networkRange;
    }

    notify({
      title: "Network Settings",
      description: `Network settings successfully updated.`,
      promise: saveRequest
        .put({
          id: account.id,
          settings: updatedSettings,
        })
        .then(() => {
          mutate("/accounts");
          updateRef([customDNSDomain, networkRange]);
        }),
      loadingMessage: "Updating network settings...",
    });
  };

  const domainError = useMemo(() => {
    if (customDNSDomain == "") return "";
    const valid = validator.isValidDomain(customDNSDomain, {
      allowWildcard: false,
      allowOnlyTld: false,
    });
    if (!valid) {
      return "Please enter a valid domain, e.g. example.com or intra.example.com";
    }
  }, [customDNSDomain]);

  const networkRangeError = useMemo(() => {
    if (networkRange == "") {
      if (account.settings.network_range) {
        return "Network range cannot be empty";
      }
      return "";
    }

    try {
      const validCIDR = cidr.isValidCIDR(networkRange);
      if (!validCIDR) {
        return "Please enter a valid IPv4 CIDR range, e.g. 100.64.0.0/16 or 192.168.1.0/24";
      }
    } catch (error) {
      return "Please enter a valid IPv4 CIDR range, e.g. 100.64.0.0/16 or 192.168.1.0/24";
    }
  }, [networkRange, account.settings.network_range]);

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
            href={"/settings?tab=networks"}
            label={"Networks"}
            icon={<NetworkIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <div className={"flex items-start justify-between"}>
          <div>
            <h1>Networks</h1>
          </div>
          <Button
            variant={"primary"}
            disabled={
              !hasChanges ||
              !permission.settings.update ||
              !!domainError ||
              !!networkRangeError
            }
            onClick={saveChanges}
          >
            Save Changes
          </Button>
        </div>

        <div className={"flex flex-col gap-6 w-full mt-8"}>
          <div>
            <div
              className={
                "flex flex-col gap-1 sm:flex-row w-full sm:gap-4 items-center"
              }
            >
              <div className={"min-w-[330px]"}>
                <Label>DNS Domain</Label>
                <HelpText>
                  Specify a custom peer DNS domain for your network. This should
                  not point to a domain that is already in use elsewhere, to
                  avoid overriding DNS results.
                </HelpText>
              </div>
              <div className={"w-full"}>
                <Input
                  placeholder={
                    isNetBirdHosted() ? "netbird.cloud" : "netbird.selfhosted"
                  }
                  errorTooltip={true}
                  errorTooltipPosition={"top"}
                  error={domainError}
                  value={customDNSDomain}
                  disabled={!permission.settings.update}
                  onChange={(e) => setCustomDNSDomain(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <div
              className={
                "flex flex-col gap-1 sm:flex-row w-full sm:gap-4 items-center"
              }
            >
              <div className={"min-w-[330px]"}>
                <Label>Network Range</Label>
                <HelpText>
                  Specify a custom IPv4 range for your network in CIDR format.
                  All peer IPs will be re-allocated when changed.
                </HelpText>
              </div>
              <div className={"w-full"}>
                <Input
                  placeholder={"e.g. 100.64.0.0/16"}
                  errorTooltip={true}
                  errorTooltipPosition={"top"}
                  error={networkRangeError}
                  value={networkRange}
                  disabled={!permission.settings.update}
                  onChange={(e) => setNetworkRange(e.target.value)}
                />
              </div>
            </div>
          </div>

          <FancyToggleSwitch
            value={routingPeerDNSSetting}
            onChange={toggleNetworkDNSSetting}
            label={
              <>
                <GlobeIcon size={15} />
                Enable DNS Wildcard Routing
              </>
            }
            helpText={
              <>
                Allow routing using DNS wildcards. This requires NetBird client
                v0.35 or higher. Changes will only take effect after restarting
                the clients.{" "}
                <InlineLink
                  href={
                    "https://docs.netbird.io/how-to/accessing-entire-domains-within-networks#enabling-dns-wildcard-routing"
                  }
                  target={"_blank"}
                  onClick={(e) => e.stopPropagation()}
                >
                  Learn more
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </>
            }
            disabled={!permission.settings.update}
          />
        </div>
      </div>
    </Tabs.Content>
  );
}
