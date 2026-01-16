import { cn, generateColorFromUser } from "@utils/helpers";
import * as React from "react";
import { useState } from "react";
import Image from "next/image";
import { useApplicationContext } from "@/contexts/ApplicationProvider";

type Props = {
  size?: "default" | "small" | "large" | "medium";
};
export const UserAvatar = ({ size = "default" }: Props) => {
  const { user } = useApplicationContext();

  const [pictureLoaded, setPictureLoaded] = useState(true);

  const getAvatarSize = () => {
    if (size === "small") return 32;
    if (size === "default") return 40;
    if (size === "large") return 48;
    return 35.2;
  };

  return pictureLoaded && user?.picture ? (
    <Image
      src={user?.picture}
      alt={""}
      onError={() => setPictureLoaded(false)}
      width={getAvatarSize()}
      height={getAvatarSize()}
      className={"rounded-full"}
    />
  ) : (
    <div
      className={cn(
        "rounded-full flex items-center justify-center bg-nb-gray-900 text-netbird uppercase",
        size == "small" && "w-8 h-8",
        size == "medium" && "w-[2.2rem] h-[2.2rem]",
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
