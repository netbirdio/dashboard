import FullTooltip from "@components/FullTooltip";
import { cn } from "@utils/helpers";
import { HelpCircle } from "lucide-react";
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
      return { text: "Pending Approval", color: "bg-orange-400" };
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
    <div
      className={cn("flex gap-2.5 items-center text-nb-gray-300 text-sm")}
      data-cy={"user-status-cell"}
    >
      <span className={cn("h-2 w-2 rounded-full", color)}></span>
      {text}
      {isPendingApproval && (
        <FullTooltip
          content={
            <div className={"max-w-xs text-xs"}>
              <p>This user requires approval from an administrator.</p>
              <p className="mt-2">
                To disable user approval requirements for new users, go to the account{" "}
                <span className="text-nb-gray-200 inline-flex gap-1 items-center max-h-[22px] font-medium bg-nb-gray-900 py-[3px] text-[11px] px-[5px] border border-nb-gray-800 rounded-[4px]">
                  Settings
                </span>{" "}
                and disable "User Approval Required".
              </p>
            </div>
          }
          interactive={true}
          side="right"
        >
          <HelpCircle size={14} className="text-orange-400 cursor-help" />
        </FullTooltip>
      )}
    </div>
  );
}
