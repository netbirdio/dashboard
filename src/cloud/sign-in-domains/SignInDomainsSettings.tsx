import { cn } from "@utils/helpers";
import * as React from "react";
import SignInDomainsTable from "@/cloud/sign-in-domains/table/SignInDomainsTable";
import { useSignInDomains } from "@/cloud/sign-in-domains/useSignInDomains";

const POLL_INTERVAL_MS = 15_000;

export const SignInDomainsSettings = () => {
  const { domains, isLoading, isUnavailable } =
    useSignInDomains(POLL_INTERVAL_MS);

  const showSkeleton = isLoading && !isUnavailable;

  return (
    <div
      className={cn(
        isLoading && "animate-pulse pointer-events-none opacity-90",
        isUnavailable && "pointer-events-none opacity-70",
      )}
      data-testid={"sign-in-domains"}
    >
      <SignInDomainsTable domains={domains} isLoading={showSkeleton} />
    </div>
  );
};
