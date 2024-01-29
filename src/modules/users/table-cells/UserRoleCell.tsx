import Badge from "@components/Badge";
import { cn } from "@utils/helpers";
import { Cog, User2 } from "lucide-react";
import React from "react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { User } from "@/interfaces/User";

type Props = {
  user: User;
};

export default function UserRoleCell({ user }: Props) {
  const role = user.role;

  return (
    <div className={cn("flex gap-3 items-center text-nb-gray-200")}>
      <Badge variant={role == "owner" ? "netbird" : "gray"}>
        {role == "user" && (
          <>
            <User2 size={14} />
            User
          </>
        )}
        {role == "admin" && (
          <>
            <Cog size={14} />
            Admin
          </>
        )}
        {role == "owner" && (
          <>
            <NetBirdIcon size={14} />
            Owner
          </>
        )}
      </Badge>
    </div>
  );
}
