import { cn } from "@utils/helpers";
import { Disc3Icon, FlagIcon } from "lucide-react";
import * as React from "react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { PostureCheck } from "@/interfaces/PostureCheck";

type Props = {
  check: PostureCheck;
};
export const PostureCheckChecksCell = ({ check }: Props) => {
  return (
    <div className={"flex items-center gap-2"}>
      <div
        className={cn(
          "bg-gradient-to-tr from-netbird-200 to-netbird-100 h-8 w-8 rounded-md flex items-center justify-center",
          !check.checks.nb_version_check && "opacity-5 pointer-events-none",
        )}
      >
        <NetBirdIcon size={14} />
      </div>
      <div
        className={cn(
          "bg-gradient-to-tr from-indigo-500 to-indigo-400 h-8 w-8 rounded-md flex items-center justify-center",
          !check.checks.geo_location_check && "opacity-5 pointer-events-none",
        )}
      >
        <FlagIcon size={14} />
      </div>
      <div
        className={cn(
          "bg-gradient-to-tr from-nb-gray-500 to-nb-gray-300 h-8 w-8 rounded-md flex items-center justify-center",
          !check.checks.os_version_check && "opacity-5 pointer-events-none",
        )}
      >
        <Disc3Icon size={14} />
      </div>
    </div>
  );
};
