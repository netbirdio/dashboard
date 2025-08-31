import { cn } from "@utils/helpers";
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
    </div>
  );
}
