import { IconSettings2 } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import React from "react";
import { User } from "@/interfaces/User";

type Props = {
  user: User;
};

export default function ServiceUserNameCell({ user }: Props) {
  return (
    <div className={cn("flex gap-4 px-2 py-1 items-center")}>
      <div
        className={
          "w-8 h-8 rounded-full relative flex items-center justify-center text-white uppercase text-md font-medium bg-nb-gray-900"
        }
      >
        <IconSettings2 size={14} />
      </div>
      <div className={"flex flex-col justify-center"}>
        <span className={cn("text-base font-medium flex items-center gap-3")}>
          {user.name}
        </span>
      </div>
    </div>
  );
}
