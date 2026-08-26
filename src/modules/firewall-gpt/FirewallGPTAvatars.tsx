import { generateColorFromString } from "@utils/helpers";
import { Cog, Loader2 } from "lucide-react";
import * as React from "react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { useLoggedInUser } from "@/contexts/UsersProvider";

const AssistantAvatar = () => {
  return (
    <div
      className={
        "w-8 h-8 shrink-0 p-[2px] rounded-full relative flex overflow-hidden items-center justify-center text-white uppercase text-[14px] leading-[0] font-medium bg-nb-blue-900"
      }
    >
      <span
        className={"w-full h-full animated-gradient-bg absolute z-0 opacity-50"}
      ></span>

      <span
        className={
          "z-[2] h-full relative flex items-center justify-center bg-nb-gray-930/30 w-full rounded-full"
        }
      >
        <NetBirdIcon size={17} className={"top-[1px] relative"} />
      </span>
    </div>
  );
};

const LoadingAvatar = () => {
  return (
    <div
      className={
        "w-8 h-8 shrink-0 rounded-full relative flex items-center justify-center text-white uppercase text-[14px] leading-[0] font-medium bg-nb-blue-900"
      }
    >
      <Loader2 size={16} className={"text-nb-blue-100 animate-spin"} />
    </div>
  );
};

const UserAvatar = () => {
  const { loggedInUser: user } = useLoggedInUser();
  return (
    <div
      className={
        "w-8 h-8 shrink-0 rounded-full relative flex items-center justify-center text-white uppercase text-[14px] leading-[0] font-medium bg-nb-gray-900"
      }
      style={{
        color: user?.name
          ? generateColorFromString(user?.name || user?.id || "System User")
          : "#808080",
      }}
    >
      {!user?.name && !user?.id && <Cog size={12} />}
      {user?.name?.charAt(0) || user?.id?.charAt(0)}
    </div>
  );
};

export { AssistantAvatar, LoadingAvatar, UserAvatar };
