import { cn, generateColorFromString } from "@utils/helpers";
import { Cog } from "lucide-react";
import * as React from "react";

type Props = {
  name?: string;
  email?: string;
  id?: string;
  size?: "default" | "sm";
  className?: string;
};
export const SmallUserAvatar = ({
  name,
  id,
  email,
  size = "default",
  className,
}: Props) => {
  return (
    <div
      className={cn(
        "rounded-full shrink-0 flex items-center justify-center text-white uppercase font-medium bg-nb-gray-850",
        size === "default" && "w-7 h-7 text-[12px]",
        size === "sm" && "w-5 h-5 text-[9px] leading-[0]",
        className,
      )}
      style={{
        color:
          email === "NetBird"
            ? "#808080"
            : generateColorFromString(name || id || "System User"),
      }}
    >
      {email === "NetBird" ? (
        <Cog size={14} />
      ) : (
        name?.charAt(0) || id?.charAt(0)
      )}
    </div>
  );
};
