import FullTooltip from "@components/FullTooltip";
import InlineLink from "@components/InlineLink";
import { cn } from "@utils/helpers";
import { ExternalLinkIcon, HelpCircle } from "lucide-react";
import React from "react";
import { User } from "@/interfaces/User";

type Props = {
  user: User;
};

export default function UserStatusCell({ user }: Readonly<Props>) {
  const status = user.status;
  const isPendingApproval = user.pending_approval;

  const getStatusDisplay = () => {
    if (isPendingApproval) {
      return { text: "Pending Approval", color: "bg-netbird" };
    }
    if (status === "blocked") {
      return { text: "Blocked", color: "bg-red-500" };
    }
    if (status === "invited") {
      return { text: "Pending", color: "bg-yellow-400" };
    }
    if (status === "active") {
      return { text: "Active", color: "bg-green-500" };
    }
    return { text: status || "Unknown", color: "bg-gray-400" };
  };

  const { text, color } = getStatusDisplay();

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <FullTooltip
        content={
          <div className={"max-w-xs text-xs flex flex-col gap-2"}>
            <div>
              This user needs to be approved by an administrator before it can
              join your organization.
            </div>

            <div>
              If you want to disable approval for new users, go to{" "}
              <InlineLink href={"/settings?tab=authentication"}>
                Settings
              </InlineLink>{" "}
              and disable{" "}
              <span className={"font-medium text-white"}>
                {"'User Approval Required'"}
              </span>
              .
            </div>
            <div>
              Learn more about{" "}
              <InlineLink
                href={"https://docs.netbird.io/how-to/approve-users"}
                target={"_blank"}
              >
                User Approval <ExternalLinkIcon size={12} />
              </InlineLink>
            </div>
          </div>
        }
        interactive={true}
        side="right"
        disabled={!isPendingApproval}
      >
        <div
          className={cn("flex gap-2.5 items-center text-nb-gray-300 text-sm")}
          data-cy={"user-status-cell"}
        >
          <span className={cn("h-2 w-2 rounded-full", color)}></span>
          {text}
          {isPendingApproval && (
            <HelpCircle size={14} className="text-netbird cursor-help" />
          )}
        </div>
      </FullTooltip>
    </div>
  );
}
