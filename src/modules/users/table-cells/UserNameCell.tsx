import { cn, generateColorFromUser } from "@utils/helpers";
import { Ban, Clock, Cog } from "lucide-react";
import React from "react";
import { User } from "@/interfaces/User";

type Props = {
  user: User;
};
export default function UserNameCell({ user }: Readonly<Props>) {
  const status = user.status;
  const isCurrent = user.is_current;

  const getStatusIcon = () => {
    if (user?.pending_approval) {
      return {
        color: "bg-netbird text-netbird-950",
        icon: <Clock size={12} />,
      };
    }
    if (status === "blocked") {
      return { color: "bg-red-500 text-red-100", icon: <Ban size={12} /> };
    }
    if (status === "invited") {
      return {
        color: "bg-yellow-400 text-yellow-900",
        icon: <Clock size={12} />,
      };
    }
    return { color: "bg-gray-400", icon: <Clock size={12} /> };
  };

  const { color, icon } = getStatusIcon();

  return (
    <div
      className={cn("flex gap-4 px-2 py-1 items-center")}
      data-cy={"user-name-cell"}
    >
      <div
        className={
          "w-10 h-10 rounded-full relative flex items-center justify-center text-white uppercase text-md font-medium bg-nb-gray-900"
        }
        style={{
          color: generateColorFromUser(user),
        }}
      >
        {!user?.name && !user?.id && <Cog size={12} />}
        {user?.name?.charAt(0) || user?.id?.charAt(0)}
        {(status == "invited" || status == "blocked") && (
          <div
            className={cn(
              "w-5 h-5 absolute -right-1 -bottom-1 bg-nb-gray-930 rounded-full flex items-center justify-center border-2 border-nb-gray-950",
              color,
            )}
          >
            {icon}
          </div>
        )}
      </div>
      <div className={"flex flex-col justify-center"}>
        <span className={cn("text-base font-medium flex items-center gap-3")}>
          {user.name || user.id}
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
