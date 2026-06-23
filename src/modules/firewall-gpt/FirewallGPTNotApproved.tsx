import { LockIcon } from "lucide-react";
import * as React from "react";
import { RegistrationStatus } from "@/interfaces/FirewallGPT";

type Props = {
  status: RegistrationStatus;
};
export const FirewallGptNotApproved = ({ status }: Props) => {
  return (
    status.status !== "approved" && (
      <div
        className={
          "absolute w-full h-full left-0 top-0 z-50 flex items-center justify-center bg-nb-gray-950/70 backdrop-blur-sm flex-col gap-2"
        }
      >
        <LockIcon size={20} className={"text-nb-gray-300"} />
        <span className={"text-center max-w-xl text-sm text-nb-gray-300"}>
          {`You don't have access to NetBird's Smart Firewall.`}
          <br />
          {`We will notify you by email as soon as it's available for your account.`}
        </span>
      </div>
    )
  );
};
