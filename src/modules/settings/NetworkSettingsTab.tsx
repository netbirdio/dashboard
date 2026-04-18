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
import { useI18n } from "@/i18n/I18nProvider";
import { Account } from "@/interfaces/Account";

type Props = {
  account: Account;
};

export default function NetworkSettingsTab({ account }: Readonly<Props>) {
  const { permission } = usePermissions();
  const { t } = useI18n();

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
      title: t("networkSettings.dnsWildcardTitle"),
      description: toggle
        ? t("networkSettings.dnsWildcardEnabled")
        : t("networkSettings.dnsWildcardDisabled"),
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
      loadingMessage: t("networkSettings.dnsWildcardUpdating"),
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
      title: t("networkSettings.notifyTitle"),
      description: t("networkSettings.updatedDescription"),
      promise: saveRequest
        .put({
          id: account.id,
          settings: updatedSettings,
        })
        .then(() => {
          mutate("/accounts");
          updateRef([customDNSDomain, networkRange]);
        }),
      loadingMessage: t("networkSettings.updating"),
    });
  };

  const domainError = useMemo(() => {
    if (customDNSDomain == "") return "";
    const valid = validator.isValidDomain(customDNSDomain, {
      allowWildcard: false,
      allowOnlyTld: false,
    });
    if (!valid) {
      return t("networkSettings.domainError");
    }
  }, [customDNSDomain, t]);

  const networkRangeError = useMemo(() => {
    if (networkRange == "") {
      if (account.settings.network_range) {
        return t("networkSettings.networkRangeEmptyError");
      }
      return "";
    }

    try {
      const validCIDR = cidr.isValidCIDR(networkRange);
      if (!validCIDR) {
        return t("networkSettings.networkRangeError");
      }
    } catch (error) {
      return t("networkSettings.networkRangeError");
    }
  }, [networkRange, account.settings.network_range, t]);

  return (
    <Tabs.Content value={"networks"}>
      <div className={"p-default py-6 max-w-2xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={t("settings.title")}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings?tab=networks"}
            label={t("settings.networks")}
            icon={<NetworkIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <div className={"flex items-start justify-between"}>
          <div>
            <h1>{t("settings.networks")}</h1>
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
            {t("actions.saveChanges")}
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
                <Label>{t("networkSettings.dnsDomain")}</Label>
                <HelpText>
                  {t("networkSettings.dnsDomainHelp")}
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
                <Label>{t("networkSettings.networkRange")}</Label>
                <HelpText>
                  {t("networkSettings.networkRangeHelp")}
                </HelpText>
              </div>
              <div className={"w-full"}>
                <Input
                  placeholder={t("networkSettings.networkRangePlaceholder")}
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
                {t("networkSettings.enableDnsWildcardRouting")}
              </>
            }
            helpText={
              <>
                {t("networkSettings.enableDnsWildcardRoutingHelp")}{" "}
                <InlineLink
                  href={
                    "https://docs.netbird.io/how-to/accessing-entire-domains-within-networks#enabling-dns-wildcard-routing"
                  }
                  target={"_blank"}
                  onClick={(e) => e.stopPropagation()}
                >
                  {t("clientSettings.learnMore")}
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
