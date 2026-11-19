import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import { SkeletonIntegration } from "@components/skeletons/SkeletonIntegration";
import * as Tabs from "@radix-ui/react-tabs";
import { ExternalLinkIcon, KeyRoundIcon } from "lucide-react";
import React from "react";
import IntegrationIcon from "@/assets/icons/IntegrationIcon";
import { useTranslations } from "@/i18n/LocaleProvider";
import { useAccount } from "@/modules/account/useAccount";
import { LockedFeatureInfoCard } from "@/modules/billing/locked-feature/LockedFeatureInfoCard";
import { LockedFeatureOverlay } from "@/modules/billing/locked-feature/LockedFeatureOverlay";
import { OktaSSOIntegrationCard } from "@/modules/integrations/sso/okta/OktaSSOIntegrationCard";

export default function SSOTab() {
  const t = useTranslations();
  const account = useAccount();

  return (
    <Tabs.Content value={"sso"}>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/integrations"}
            label={t("common.integrations")}
            icon={<IntegrationIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings?tab=sso"}
            label={t("common.singleSignOn")}
            icon={<KeyRoundIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <h1>{t("common.singleSignOn")}</h1>
        <Paragraph>{t("integrations.ssoTabDescription")}</Paragraph>
        <Paragraph>
          <InlineLink
            href={
              "https://docs.netbird.io/how-to/okta-sync#configuring-sso-in-okta"
            }
            target={"_blank"}
          >
            {t("common.learnMore")}
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>

        <LockedFeatureInfoCard
          featureText={"Identity Provider (IdP) Sync"}
          feature={"IDP_SYNC"}
        />

        <LockedFeatureOverlay feature={"IDP_SYNC"}>
          <div className={"gap-6 mt-6 flex flex-wrap"}>
            {!account ? (
              <>
                <SkeletonIntegration loadingHeight={196} />
                <SkeletonIntegration loadingHeight={196} />
                <SkeletonIntegration loadingHeight={196} />
                <SkeletonIntegration loadingHeight={196} />
              </>
            ) : (
              <>
                <OktaSSOIntegrationCard />
                {/* <OidcIntegrationCard
                  name={"Keycloak"}
                  description={
                    "Keycloak is an open source identity and access management solution."
                  }
                  logo={KeycloakLogo}
                  site={"keycloak.org"}
                  siteHref={"https://www.keycloak.org/"}
                  discoveryPlaceholder={
                    "https://mydomain.com/realms/myrealm/.well-known/openid-configuration"
                  }
                />*/}
                {/*  <OidcIntegrationCard
                  name={"JumpCloud"}
                  description={
                    "A unified identity, device, and access management platform."
                  }
                  logo={JumpCloudLogo}
                  site={"jumpcloud.com"}
                  siteHref={"https://jumpcloud.com/"}
                  discoveryPlaceholder={
                    "https://id.mydomain.com/.well-known/openid-configuration"
                  }
                />*/}
              </>
            )}
          </div>
        </LockedFeatureOverlay>
      </div>
    </Tabs.Content>
  );
}
