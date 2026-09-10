import Button from "@components/Button";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Label } from "@components/Label";
import { cn } from "@utils/helpers";
import { isNetBirdCloud } from "@utils/netbird";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useDomainCategory } from "@/cloud/cloud-hooks/useDomainCategory";
import { AddSignInDomainModal } from "@/cloud/sign-in-domains/AddSignInDomainModal";
import SignInDomainsTable from "@/cloud/sign-in-domains/table/SignInDomainsTable";
import { useSignInDomains } from "@/cloud/sign-in-domains/useSignInDomains";
import { usePermissions } from "@/contexts/PermissionsProvider";

const POLL_INTERVAL_MS = 15_000;

const SIGN_IN_DOMAINS_DOCS_LINK =
  "https://docs.netbird.io/manage/settings/sign-in-domains";

export const useCanViewSignInDomains = () => {
  const { permission } = usePermissions();
  const { isPrivate } = useDomainCategory();
  return Boolean(permission?.settings?.read) && isNetBirdCloud() && isPrivate;
};

export const SignInDomainsSettings = () => {
  const { permission } = usePermissions();
  const { domains, isLoading, isUnavailable } =
    useSignInDomains(POLL_INTERVAL_MS);
  const [addModal, setAddModal] = useState(false);

  const showSkeleton = isLoading && !isUnavailable;

  return (
    <div
      className={cn(
        isLoading && "animate-pulse pointer-events-none opacity-90",
        isUnavailable && "pointer-events-none opacity-70",
      )}
      data-testid={"sign-in-domains"}
    >
      <div className={"flex items-end justify-between gap-4 mb-4"}>
        <div className={"min-w-0"}>
          <Label>Sign-in Domains</Label>
          <HelpText className={"!mb-0"}>
            Users from these domains can join your account.{" "}
            <InlineLink href={SIGN_IN_DOMAINS_DOCS_LINK} target={"_blank"}>
              Learn more
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </HelpText>
        </div>
        <Button
          variant={"primary"}
          size={"xs"}
          className={"shrink-0"}
          disabled={!permission?.settings?.update || isUnavailable}
          onClick={() => setAddModal(true)}
          data-testid={"add-domain"}
        >
          <PlusCircle size={16} />
          Add
        </Button>
      </div>

      <SignInDomainsTable domains={domains} isLoading={showSkeleton} />

      <AddSignInDomainModal open={addModal} onOpenChange={setAddModal} />
    </div>
  );
};
