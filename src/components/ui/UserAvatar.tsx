import { cn, generateColorFromString } from "@utils/helpers";
import { Avatar } from "flowbite-react";
import * as React from "react";
import { useState } from "react";
import { useApplicationContext } from "@/contexts/ApplicationProvider";

type Props = {
  size?: "default" | "small" | "large";
};
export const UserAvatar = ({ size = "default" }: Props) => {
  const { user } = useApplicationContext();

  const [pictureLoaded, setPictureLoaded] = useState(true);

  return pictureLoaded ? (
    <Avatar
      alt=""
      img={user?.picture}
      rounded
      onError={() => setPictureLoaded(false)}
      size={size == "small" ? "sm" : size == "large" ? "lg" : "md"}
      className={"shrink-0"}
    />
  ) : (
    <div
      className={cn(
        "rounded-full flex items-center justify-center bg-nb-gray-900 text-netbird uppercase",
        size == "small" && "w-8 h-8",
        size == "default" && "w-10 h-10",
        size == "large" && "w-12 h-12",
      )}
      style={{
        color: user?.name
          ? generateColorFromString(user?.name || "System User")
          : "#808080",
      }}
    >
      {user?.name?.charAt(0)}
    </div>
  );
};
