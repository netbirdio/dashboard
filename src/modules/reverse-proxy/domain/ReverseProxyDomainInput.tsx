import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { Callout } from "@components/Callout";
import React from "react";
import { CustomDomainSelector } from "./CustomDomainSelector";
import { isNetBirdHosted } from "@utils/netbird";
import InlineLink from "@components/InlineLink";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  subdomain: string;
  onSubdomainChange: (value: string) => void;
  baseDomain: string;
  onBaseDomainChange: (value: string) => void;
  domainAlreadyExists: boolean;
  subdomainRequired?: boolean;
  clusterOffline?: {
    clusterName: string;
  };
};

export default function ReverseProxyDomainInput({
  subdomain,
  onSubdomainChange,
  baseDomain,
  onBaseDomainChange,
  domainAlreadyExists,
  subdomainRequired = false,
  clusterOffline,
}: Readonly<Props>) {
  const { t } = useI18n();

  return (
    <div>
      <Label>{t("reverseProxy.domain")}</Label>
      <HelpText>
        {subdomainRequired
          ? t("reverseProxy.domainInputRequiredHelp")
          : t("reverseProxy.domainInputOptionalHelp")}
      </HelpText>
      <div className="flex items-start mt-2">
        <div className="flex-1 min-w-0">
          <Input
            autoFocus
            value={subdomain}
            onChange={(e) => {
              onSubdomainChange(
                e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
              );
            }}
            error={
              domainAlreadyExists
                ? t("reverseProxy.domainAlreadyUsed")
                : undefined
            }
            placeholder={
              subdomainRequired
                ? t("reverseProxy.subdomainPlaceholder")
                : t("reverseProxy.subdomainOptionalPlaceholder")
            }
            className="!rounded-r-none !border-r-0"
          />
        </div>
        <div className="flex-1 min-w-0">
          <CustomDomainSelector
            value={baseDomain}
            onChange={onBaseDomainChange}
            className="!rounded-l-none"
          />
        </div>
      </div>

      {clusterOffline &&
        (isNetBirdHosted() ? (
          <Callout variant={"warning"} className={"mt-3"}>
            {t("reverseProxy.clusterOfflineHostedPrefix", {
              clusterName: clusterOffline.clusterName,
            })}{" "}
            <InlineLink href={"https://status.netbird.io/"} target={"_blank"}>
              {t("reverseProxy.netbirdStatus")}
            </InlineLink>{" "}
            {t("reverseProxy.clusterOfflineHostedMiddle")}{" "}
            <InlineLink href={"mailto:support@netbird.io"}>
              support@netbird.io
            </InlineLink>
          </Callout>
        ) : (
          <Callout variant={"error"} className={"mt-3"}>
            {t("reverseProxy.clusterOfflineSelfHosted", {
              clusterName: clusterOffline.clusterName,
            })}
          </Callout>
        ))}
    </div>
  );
}
