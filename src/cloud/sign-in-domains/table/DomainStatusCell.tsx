import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import * as React from "react";
import { DomainValidationStatus, SignInDomain } from "@/interfaces/Account";

type Props = {
  domain: SignInDomain;
};

const FAILED_HINT =
  "This domain could not be verified. Check that the TXT record is published, then try again. If it keeps failing, contact support@netbird.io";

export default function DomainStatusCell({ domain }: Readonly<Props>) {
  const status = domain.validation_status;
  const isVerified = status === DomainValidationStatus.VERIFIED;
  const isPending = status === DomainValidationStatus.PENDING;
  const isFailed = status === DomainValidationStatus.FAILED;

  return (
    <FullTooltip
      content={<div className={"text-xs max-w-xs"}>{FAILED_HINT}</div>}
      disabled={!isFailed}
      interactive={false}
    >
      <div
        className={"flex items-center gap-2 text-sm text-nb-gray-300 mr-auto"}
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full shrink-0",
            isVerified && "bg-green-400",
            isPending && "bg-yellow-400",
            !isVerified && !isPending && "bg-red-500",
          )}
        />
        {statusLabel(status)}
      </div>
    </FullTooltip>
  );
}

function statusLabel(status: DomainValidationStatus) {
  if (status === DomainValidationStatus.VERIFIED) return "Verified";
  if (status === DomainValidationStatus.PENDING) return "Pending";
  return "Unverified";
}
