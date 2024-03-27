import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import { Label } from "@components/Label";
import Paragraph from "@components/Paragraph";
import { SkeletonIntegration } from "@components/skeletons/SkeletonIntegration";
import * as Tabs from "@radix-ui/react-tabs";
import { ExternalLinkIcon, FingerprintIcon } from "lucide-react";
import React from "react";
import IntegrationIcon from "@/assets/icons/IntegrationIcon";
import { useAccount } from "@/modules/account/useAccount";
import { AzureAD } from "@/modules/integrations/idp-sync/azure-ad/AzureAD";
import { GoogleWorkspace } from "@/modules/integrations/idp-sync/google-workspace/GoogleWorkspace";
import { Okta } from "@/modules/integrations/idp-sync/okta-scim/Okta";
import { useIntegrations } from "@/modules/integrations/idp-sync/useIntegrations";

export default function IdentityProviderTab() {
  const account = useAccount();

  useIntegrations();

  return (
    <Tabs.Content value={"identity-provider"}>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/integrations"}
            label={"Integrations"}
            icon={<IntegrationIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings"}
            label={"Identity Provider"}
            icon={<FingerprintIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <h1>Identity Provider</h1>
        <Paragraph>
          Configure your preferred Identity Provider (IdP) to synchronize your
          users and groups to NetBird.
        </Paragraph>
        <Paragraph>
          Learn more about{" "}
          <InlineLink
            href={"https://docs.netbird.io/how-to/idp-sync"}
            target={"_blank"}
          >
            Identity Provider
            <ExternalLinkIcon size={12} />
          </InlineLink>
          in our documentation.
        </Paragraph>
        <div className={"gap-6 mt-6 flex flex-wrap"}>
          {!account ? (
            <>
              <SkeletonIntegration loadingHeight={196} />
              <SkeletonIntegration loadingHeight={196} />
              <SkeletonIntegration loadingHeight={196} />
            </>
          ) : (
            <>
              <GoogleWorkspace />
              <AzureAD />
              <Okta />
            </>
          )}
        </div>
        <div className={"flex flex-col gap-6 max-w-lg mt-10"}>
          <div
            className={
              "bg-netbird-950 px-6 py-4 rounded-md border border-netbird-500 "
            }
          >
            <Label className={"!text-netbird-100 text-md"}>
              Looking to enable a custom IDP like Jumpcloud?
            </Label>
            <p className={"!text-netbird-200 mt-2"}>
              Please contact us at{" "}
              <InlineLink
                href={"mailto:support@netbird.io"}
                className={"inline !text-netbird-500 font-medium"}
              >
                {" "}
                support@netbird.io
              </InlineLink>{" "}
            </p>
          </div>
        </div>
      </div>
    </Tabs.Content>
  );
}
