import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import Paragraph from "@components/Paragraph";
import { VerticalTabs } from "@components/VerticalTabs";
import * as Tabs from "@radix-ui/react-tabs";
import { isNetBirdCloud } from "@utils/netbird";
import { ExternalLinkIcon, GlobeIcon, PlusCircle } from "lucide-react";
import React, { useState } from "react";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { useDomainCategory } from "@/cloud/cloud-hooks/useDomainCategory";
import { AddSignInDomainModal } from "@/cloud/sign-in-domains/AddSignInDomainModal";
import { SignInDomainsSettings } from "@/cloud/sign-in-domains/SignInDomainsSettings";
import { useSignInDomains } from "@/cloud/sign-in-domains/useSignInDomains";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Account } from "@/interfaces/Account";

const SIGN_IN_DOMAINS_DOCS_LINK = "https://docs.netbird.io";

type Props = {
  account: Account;
};

const canViewSignInDomains = (account?: Account) =>
  isNetBirdCloud() && account?.domain_category === "private";

export const SignInDomainsTabTrigger = () => {
  const { permission } = usePermissions();
  const { isPrivate } = useDomainCategory();
  if (!permission?.settings?.read || !isNetBirdCloud() || !isPrivate) return;

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

export const SignInDomainsTab = ({ account }: Readonly<Props>) => {
  const { permission } = usePermissions();
  if (!permission?.settings?.read || !canViewSignInDomains(account)) return;

  return (
    <Tabs.Content value={"sign-in-domains"}>
      <SignInDomainsTabContent />
    </Tabs.Content>
  );
};

const SignInDomainsTabContent = () => {
  const { permission } = usePermissions();
  const { isUnavailable } = useSignInDomains();
  const [addModal, setAddModal] = useState(false);

  return (
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
      <div className={"flex items-end justify-between gap-4 -mt-1"}>
        <div className={"min-w-0"}>
          <h1>Sign-in Domains</h1>
          <Paragraph className={"block !mb-0"}>
            Domains matching users to your account.{" "}
            <InlineLink href={SIGN_IN_DOMAINS_DOCS_LINK} target={"_blank"}>
              Learn more
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <Button
          variant={"primary"}
          className={"shrink-0"}
          disabled={!permission?.settings?.update || isUnavailable}
          onClick={() => setAddModal(true)}
          data-testid={"add-domain"}
        >
          <PlusCircle size={16} />
          Add
        </Button>
      </div>
      <div className={"mt-6"}>
        <SignInDomainsSettings />
      </div>
      <AddSignInDomainModal open={addModal} onOpenChange={setAddModal} />
    </div>
  );
};
