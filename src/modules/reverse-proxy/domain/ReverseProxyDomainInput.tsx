import { Callout } from "@components/Callout";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { isNetBirdCloud } from "@utils/netbird";
import React from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { CustomDomainSelector } from "./CustomDomainSelector";

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
  const t = useTranslations();
  return (
    <div>
      <Label>{t("common.domain")}</Label>
      <HelpText>
        {subdomainRequired
          ? t("reverseProxy.enterASubdomainAndSelectADomainForYourService")
          : t("reverseProxy.optionallyEnterASubdomainOrUseTheDomainDirectly")}
      </HelpText>
      <div className="flex items-start mt-2">
        <div className="flex-1 min-w-0">
          <Input
            autoFocus
            data-testid="proxy-subdomain-input"
            value={subdomain}
            onChange={(e) => {
              onSubdomainChange(
                e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
              );
            }}
            error={
              domainAlreadyExists
                ? t("reverseProxy.thisDomainIsAlreadyUsedByAnotherService")
                : undefined
            }
            placeholder={
              subdomainRequired ? "myapp" : t("reverseProxy.myappOptional")
            }
            className="!rounded-r-none !border-r-0"
          />
        </div>
        <div className="flex-1 min-w-0">
          <CustomDomainSelector
            value={baseDomain}
            onChange={onBaseDomainChange}
            className="!rounded-l-none"
            data-testid="proxy-domain-selector"
          />
        </div>
      </div>

      {clusterOffline &&
        (isNetBirdCloud() ? (
          <Callout variant={"warning"} className={"mt-3"}>
            {t.rich("reverseProxy.clusterOfflineHelp", {
              name: clusterOffline.clusterName,
              status: (chunks) => (
                <InlineLink href="https://status.netbird.io/" target="_blank">
                  {chunks}
                </InlineLink>
              ),
              support: (chunks) => (
                <InlineLink href="mailto:support@netbird.io">
                  {chunks}
                </InlineLink>
              ),
            })}
          </Callout>
        ) : (
          <Callout variant={"error"} className={"mt-3"}>
            {t.rich("reverseProxy.selfHostedClusterOffline", {
              name: clusterOffline.clusterName,
            })}
          </Callout>
        ))}
    </div>
  );
}
