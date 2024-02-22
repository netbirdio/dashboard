import { cn } from "@utils/helpers";
import { Disc3Icon, FlagIcon } from "lucide-react";
import * as React from "react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { PostureCheck } from "@/interfaces/PostureCheck";
import { GeoLocationTooltip } from "@/modules/posture-checks/checks/tooltips/GeoLocationTooltip";
import { NetBirdVersionTooltip } from "@/modules/posture-checks/checks/tooltips/NetBirdVersionTooltip";
import { OperatingSystemTooltip } from "@/modules/posture-checks/checks/tooltips/OperatingSystemTooltip";

type Props = {
  check: PostureCheck;
};
export const PostureCheckChecksCell = ({ check }: Props) => {
  return (
    <div className={"flex"}>
      <div
        className={
          "flex items-center gap-3 bg-nb-gray-900/80 hover:bg-nb-gray-800 border border-nb-gray-800/50 py-1 rounded-full px-1 transition-all"
        }
      >
        <div className={"flex -space-x-2 "}>
          {check.checks.nb_version_check && (
            <NetBirdVersionTooltip
              version={check.checks.nb_version_check.min_version}
            >
              <div
                className={cn(
                  "bg-gradient-to-tr from-netbird-200 to-netbird-100 h-8 w-8 rounded-full flex items-center justify-center relative z-[10] hover:scale-[1.1] transition-all",
                )}
              >
                <NetBirdIcon size={14} />
              </div>
            </NetBirdVersionTooltip>
          )}

          {check.checks.geo_location_check && (
            <GeoLocationTooltip check={check.checks.geo_location_check}>
              <div
                className={cn(
                  "bg-gradient-to-tr from-indigo-500 to-indigo-400 h-8 w-8 rounded-full flex items-center justify-center relative z-[9] hover:scale-[1.1] transition-all",
                )}
              >
                <FlagIcon size={14} />
              </div>
            </GeoLocationTooltip>
          )}

          {check.checks.os_version_check && (
            <OperatingSystemTooltip check={check.checks.os_version_check}>
              <div
                className={cn(
                  "bg-gradient-to-tr from-nb-gray-500 to-nb-gray-300 h-8 w-8 rounded-full flex items-center justify-center relative z-[8] hover:scale-[1.1] transition-all",
                )}
              >
                <Disc3Icon size={14} />
              </div>
            </OperatingSystemTooltip>
          )}
        </div>
      </div>
    </div>
  );
};
