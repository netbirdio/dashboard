import { cn, generateColorFromString } from "@utils/helpers";
import { Cog } from "lucide-react";
import * as React from "react";

type Props = {
  name?: string;
  email?: string;
  id?: string;
  className?: string;
};
export const SmallUserAvatar = ({ name, id, email, className }: Props) => {
  return (
    <div
      className={cn(
        "w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white uppercase text-[12px] font-medium bg-nb-gray-850",
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
