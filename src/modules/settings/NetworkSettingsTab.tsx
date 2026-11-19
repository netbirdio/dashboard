import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { SkeletonSettings } from "@components/skeletons/SkeletonSettings";
import { useHasChanges } from "@hooks/useHasChanges";
import * as Tabs from "@radix-ui/react-tabs";
import { useApiCall } from "@utils/api";
import { validator } from "@utils/helpers";
import { isValidCIDR } from "@utils/ip";
import { isNetBirdCloud } from "@utils/netbird";
import { ExternalLinkIcon, GlobeIcon } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { TrafficEventSetting } from "@/cloud/traffic-events/TrafficEventSetting";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Account } from "@/interfaces/Account";
import useGroupHelper from "@/modules/groups/useGroupHelper";

type Props = {
  account: Account;
};

export default function NetworkSettingsTab({ account }: Readonly<Props>) {
  const { isLoading: isGroupsLoading } = useGroups();

  return isGroupsLoading ? (
    <SkeletonSettings />
  ) : (
    <NetworkSettingsTabContent account={account} />
  );
}

function NetworkSettingsTabContent({ account }: Readonly<Props>) {
  const translate = useTranslations();
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
  const [networkRangeV6, setNetworkRangeV6] = useState(
    account.settings.network_range_v6 || "",
  );
  const [ipv6EnabledGroups, setIpv6EnabledGroups, { save: saveGroups }] =
    useGroupHelper({
      initial: account.settings?.ipv6_enabled_groups,
    });
  const ipv6GroupNames = useMemo(
    () => ipv6EnabledGroups.map((g) => g.name).sort(),
    [ipv6EnabledGroups],
  );

  const toggleNetworkDNSSetting = async (toggle: boolean) => {
    notify({
      title: translate("settings.routingDnsTitle"),
      description: translate(
        toggle
          ? "settings.routingDnsStateEnabled"
          : "settings.routingDnsStateDisabled",
      ),
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
      loadingMessage: translate("settings.routingDnsUpdating"),
    });
  };

  const { hasChanges, updateRef } = useHasChanges([
    customDNSDomain,
    networkRange,
    networkRangeV6,
    ipv6GroupNames,
  ]);

  const saveChanges = async () => {
    const groups = await saveGroups();
    const ipv6EnabledGroupIds = groups
      .map((group) => group.id)
      .filter(Boolean) as string[];

    const updatedSettings = {
      ...account.settings,
      ipv6_enabled_groups: ipv6EnabledGroupIds,
    };

    if (customDNSDomain !== "" || account.settings.dns_domain) {
      updatedSettings.dns_domain = customDNSDomain;
    }

    // Only send network ranges when the user actually changed them, to avoid
    // triggering a reallocation when the server hasn't stored an explicit override.
    if (networkRange !== (account.settings.network_range || "")) {
      updatedSettings.network_range = networkRange;
    } else {
      delete updatedSettings.network_range;
    }

    if (networkRangeV6 !== (account.settings.network_range_v6 || "")) {
      updatedSettings.network_range_v6 = networkRangeV6;
    } else {
      delete updatedSettings.network_range_v6;
    }

    notify({
      title: translate("settings.networkTitle"),
      description: translate("settings.networkUpdated"),
      promise: saveRequest
        .put({
          id: account.id,
          settings: updatedSettings,
        })
        .then(() => {
          mutate("/accounts");
          updateRef([
            customDNSDomain,
            networkRange,
            networkRangeV6,
            ipv6GroupNames,
          ]);
        }),
      loadingMessage: translate("settings.networkUpdating"),
    });
  };

  const domainError = useMemo(() => {
    if (customDNSDomain == "") return "";
    const valid = validator.isValidDomain(customDNSDomain, {
      allowWildcard: false,
      allowOnlyTld: true,
      preventLeadingAndTrailingDots: true,
    });
    if (!valid) {
      return translate("settings.domainInvalid");
    }
  }, [customDNSDomain, translate]);

  const networkRangeError = useMemo(() => {
    if (networkRange == "") {
      if (account.settings.network_range) {
        return translate("settings.rangeRequired");
      }
      return "";
    }

    try {
      const validCIDR = isValidCIDR(networkRange);
      if (!validCIDR) {
        return translate("settings.ipv4RangeInvalid");
      }
    } catch (error) {
      return translate("settings.ipv4RangeInvalid");
    }
  }, [networkRange, account.settings.network_range, translate]);

  const networkRangeV6Error = useMemo(() => {
    if (networkRangeV6 == "") return "";
    if (!networkRangeV6.includes(":") || !isValidCIDR(networkRangeV6)) {
      return translate("settings.ipv6RangeInvalid");
    }
    const prefixLen = parseInt(networkRangeV6.split("/")[1], 10);
    if (prefixLen < 48 || prefixLen > 112) {
      return translate("settings.ipv6PrefixInvalid");
    }
  }, [networkRangeV6, translate]);

  return (
    <Tabs.Content value={"networks"}>
      <div className={"p-default py-6 max-w-2xl"}>
        <div className={"flex items-start justify-between -mt-1"}>
          <div>
            <h1>{translate("common.networks")}</h1>
          </div>
          <Button
            variant={"primary"}
            disabled={
              !hasChanges ||
              !permission.settings.update ||
              !!domainError ||
              !!networkRangeError ||
              !!networkRangeV6Error
            }
            onClick={saveChanges}
            data-testid="save-network-settings"
          >
            {translate("common.saveChanges")}
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
                <Label>{translate("settings.dnsDomain")}</Label>
                <HelpText>{translate("settings.dnsDomainHelp")}</HelpText>
              </div>
              <div className={"w-full"}>
                <Input
                  placeholder={
                    isNetBirdCloud() ? "netbird.cloud" : "netbird.selfhosted"
                  }
                  errorTooltip={true}
                  errorTooltipPosition={"top"}
                  error={domainError}
                  value={customDNSDomain}
                  disabled={!permission.settings.update}
                  onChange={(e) => setCustomDNSDomain(e.target.value)}
                  data-testid="dns-domain-input"
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
                <Label>{translate("settings.networkRange")}</Label>
                <HelpText>{translate("settings.networkRangeHelp")}</HelpText>
              </div>
              <div className={"w-full"}>
                <Input
                  placeholder={translate("settings.ipv4RangePlaceholder")}
                  errorTooltip={true}
                  errorTooltipPosition={"top"}
                  error={networkRangeError}
                  value={networkRange}
                  disabled={!permission.settings.update}
                  onChange={(e) => setNetworkRange(e.target.value)}
                  data-testid="network-range-input"
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
                <Label>{translate("settings.ipv6NetworkRange")}</Label>
                <HelpText>
                  {translate("settings.ipv6NetworkRangeHelp")}
                </HelpText>
              </div>
              <div className={"w-full"}>
                <Input
                  placeholder={translate(
                    "settings.ipv6NetworkRangePlaceholder",
                  )}
                  errorTooltip={true}
                  errorTooltipPosition={"top"}
                  error={networkRangeV6Error}
                  value={networkRangeV6}
                  disabled={!permission.settings.update}
                  onChange={(e) => setNetworkRangeV6(e.target.value)}
                  data-testid="network-range-v6-input"
                />
              </div>
            </div>
          </div>

          <div>
            <Label>{translate("settings.ipv6EnabledGroups")}</Label>
            <HelpText>{translate("settings.ipv6EnabledGroupsHelp")}</HelpText>
            <PeerGroupSelector
              values={ipv6EnabledGroups}
              onChange={setIpv6EnabledGroups}
              placeholder={translate("settings.selectIpv6Groups")}
              showResourceCounter={false}
              disabled={!permission.settings.update}
              data-testid="ipv6-enabled-groups-selector"
            />
          </div>

          <div className={"mt-4"} />

          <FancyToggleSwitch
            value={routingPeerDNSSetting}
            onChange={toggleNetworkDNSSetting}
            data-testid="dns-wildcard-routing"
            label={
              <>
                <GlobeIcon size={15} />
                {translate("settings.enableRoutingDns")}
              </>
            }
            helpText={
              <>
                {translate("settings.routingDnsHelp")}{" "}
                <InlineLink
                  href={
                    "https://docs.netbird.io/how-to/accessing-entire-domains-within-networks#enabling-dns-wildcard-routing"
                  }
                  target={"_blank"}
                  onClick={(e) => e.stopPropagation()}
                >
                  {translate("common.learnMore")}
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </>
            }
            disabled={!permission.settings.update}
          />
          {account && <TrafficEventSetting account={account} />}
        </div>
      </div>
    </Tabs.Content>
  );
}
