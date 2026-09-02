import { cn } from "@utils/helpers";
import * as React from "react";
import { DomainValidationStatus, SignInDomain } from "@/interfaces/Account";

type Props = {
  domain: SignInDomain;
};

// A domain the service gave up on is shown as plain "Unverified": from the
// account's side it is the same situation as one that was never checked.
export default function DomainStatusCell({ domain }: Readonly<Props>) {
  const status = domain.validation_status;
  const isVerified = status === DomainValidationStatus.VERIFIED;
  const isPending = status === DomainValidationStatus.PENDING;

  const label = statusLabel(status);

  return (
    <div className={"flex items-center gap-2 text-sm text-nb-gray-300 mr-auto"}>
      <span
        className={cn(
          "h-2 w-2 rounded-full shrink-0",
          isVerified && "bg-green-400",
          isPending && "bg-yellow-400",
          !isVerified && !isPending && "bg-red-500",
        )}
      />
      {label}
    </div>
  );
}

function statusLabel(status: DomainValidationStatus) {
  if (status === DomainValidationStatus.VERIFIED) return "Verified";
  if (status === DomainValidationStatus.PENDING) return "Pending";
  return "Unverified";
}
