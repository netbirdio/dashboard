import { cn, generateColorFromUser } from "@utils/helpers";
import { Avatar } from "flowbite-react";
import * as React from "react";
import { useState } from "react";
import { useApplicationContext } from "@/contexts/ApplicationProvider";

type Props = {
  size?: "default" | "small" | "large" | "medium";
};
export const UserAvatar = ({ size = "default" }: Props) => {
  const { user } = useApplicationContext();

  const [pictureLoaded, setPictureLoaded] = useState(true);

  const getAvatarSize = () => {
    if (size === "small") return "sm";
    if (size === "large") return "lg";
    return "md";
  };

  return pictureLoaded ? (
    <Avatar
      alt=""
      img={user?.picture}
      rounded
      onError={() => setPictureLoaded(false)}
      size={getAvatarSize()}
      className={"shrink-0"}
    />
  ) : (
    <div
      className={cn(
        "rounded-full flex items-center justify-center bg-nb-gray-900 text-netbird uppercase",
        size == "small" && "w-8 h-8",
        size == "medium" && "w-[2.3rem] h-[2.3rem]",
        size == "default" && "w-10 h-10",
        size == "large" && "w-12 h-12",
      )}
      style={{
        color: generateColorFromUser(user),
      }}
    >
      {user?.name?.charAt(0) || user?.id?.charAt(0)}
    </div>
  );
};
