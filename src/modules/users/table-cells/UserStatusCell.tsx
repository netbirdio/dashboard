import { cn } from "@utils/helpers";
import React from "react";
import { User } from "@/interfaces/User";

type Props = {
  user: User;
};

export default function UserStatusCell({ user }: Readonly<Props>) {
  const status = user.status;

  return (
    <div
      className={cn("flex gap-2.5 items-center text-nb-gray-300 text-sm")}
      data-cy={"user-status-cell"}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          status == "invited" && "bg-yellow-400",
          status == "blocked" && "bg-red-500",
          status == "active" && "bg-green-500",
        )}
      ></span>
      {status == "invited" && "Pending"}
      {status == "blocked" && "Blocked"}
      {status == "active" && "Active"}
    </div>
  );
}
