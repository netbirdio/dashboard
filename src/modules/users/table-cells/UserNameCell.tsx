import { cn, generateColorFromString } from "@utils/helpers";
import { Ban, Clock, Cog } from "lucide-react";
import React from "react";
import { User } from "@/interfaces/User";

type Props = {
  user: User;
};
export default function UserNameCell({ user }: Props) {
  const status = user.status;
  const isCurrent = user.is_current;

  return (
    <div className={cn("flex gap-4 px-2 py-1 items-center")}>
      <div
        className={
          "w-10 h-10 rounded-full relative flex items-center justify-center text-white uppercase text-md font-medium bg-nb-gray-900"
        }
        style={{
          color: user?.name
            ? generateColorFromString(user?.name || "System User")
            : "#808080",
        }}
      >
        {!user?.name && <Cog size={12} />}
        {user?.name?.charAt(0)}
        {(status == "invited" || status == "blocked") && (
          <div
            className={cn(
              "w-5 h-5 absolute -right-1 -bottom-1 bg-nb-gray-930 rounded-full flex items-center justify-center border-2 border-nb-gray-950",
              status == "invited" && "bg-yellow-400 text-yellow-900",
              status == "blocked" && "bg-red-500 text-red-100",
            )}
          >
            {status == "invited" && <Clock size={12} />}
            {status == "blocked" && <Ban size={12} />}
          </div>
        )}
      </div>
      <div className={"flex flex-col justify-center"}>
        <span className={cn("text-base font-medium flex items-center gap-3")}>
          {user.name}
          {isCurrent && (
            <span
              className={
                "bg-sky-900 border border-sky-700 text-sky-200 rounded-full text-[9px] uppercase tracking-wider px-2 py-2 leading-[0]"
              }
            >
              You
            </span>
          )}
        </span>
        <span className={cn("text-sm text-nb-gray-400")}>{user.email}</span>
      </div>
    </div>
  );
}
