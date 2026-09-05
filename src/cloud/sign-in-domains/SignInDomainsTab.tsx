import Breadcrumbs from "@components/Breadcrumbs";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import { VerticalTabs } from "@components/VerticalTabs";
import * as Tabs from "@radix-ui/react-tabs";
import { isNetBirdCloud } from "@utils/netbird";
import { ExternalLinkIcon, GlobeIcon } from "lucide-react";
import React from "react";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { SignInDomainsSettings } from "@/cloud/sign-in-domains/SignInDomainsSettings";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useAccount } from "@/modules/account/useAccount";

// Points at the docs root until sign-in domains get a page of their own.
const SIGN_IN_DOMAINS_DOCS_LINK = "https://docs.netbird.io";

// The domains live in the auth service, which only cloud deployments run, and
// they are only meaningful for a company domain: accounts on a public email
// domain (gmail.com and the like) must not claim it for everyone signing in.
const useCanViewSignInDomains = () => {
  const { permission } = usePermissions();
  const account = useAccount();
  return (
    permission?.settings?.read &&
    isNetBirdCloud() &&
    account?.domain_category === "private"
  );
};

export const SignInDomainsTabTrigger = () => {
  const canView = useCanViewSignInDomains();
  if (!canView) return;

  return (
    <VerticalTabs.Trigger
      value="sign-in-domains"
      data-testid="settings-tab-sign-in-domains"
    >
      <GlobeIcon size={14} />
      Sign-in Domains
    </VerticalTabs.Trigger>
  );
};

export const SignInDomainsTab = () => {
  const canView = useCanViewSignInDomains();
  if (!canView) return;

  return (
    <Tabs.Content value={"sign-in-domains"}>
      <div className={"p-default py-6 max-w-2xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={"Settings"}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings?tab=sign-in-domains"}
            label={"Sign-in Domains"}
            icon={<GlobeIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <h1>Sign-in Domains</h1>
        {/* "block" overrides Paragraph's default flex, which would treat the
            link as its own flex item and break it onto a new line. */}
        <Paragraph className={"block"}>
          Email domains users sign in with to join this account.{" "}
          <InlineLink href={SIGN_IN_DOMAINS_DOCS_LINK} target={"_blank"}>
            Learn more
            <ExternalLinkIcon size={12} />
          </InlineLink>
        </Paragraph>
        <div className={"mt-6"}>
          <SignInDomainsSettings />
        </div>
      </div>
    </Tabs.Content>
  );
};
