import FullTooltip from "@components/FullTooltip";
import * as React from "react";
import AndroidIcon from "@/assets/icons/AndroidIcon";
import AppleIcon from "@/assets/icons/AppleIcon";
import IOSIcon from "@/assets/icons/IOSIcon";
import { LinuxIcon } from "@/assets/icons/LinuxIcon";
import WindowsIcon from "@/assets/icons/WindowsIcon";
import {
  androidVersions,
  iOSVersions,
  macOSVersions,
  OperatingSystemVersionCheck,
  windowsKernelVersions,
} from "@/interfaces/PostureCheck";
import { PostureCheckOperatingSystemInfo } from "@/modules/posture-checks/ui/PostureCheckOperatingSystemInfo";

type Props = {
  check?: OperatingSystemVersionCheck;
  children: React.ReactNode;
};
export const OperatingSystemTooltip = ({ check, children }: Props) => {
  return check ? (
    <FullTooltip
      interactive={false}
      contentClassName={"p-2.5"}
      className={"w-full"}
      content={
        <div>
          <div className={"flex flex-col gap-1"}>
            <PostureCheckOperatingSystemInfo
              icon={LinuxIcon}
              os={"Linux"}
              version={check.linux?.min_kernel_version}
              versionText={"Kernel Version"}
            />
            <PostureCheckOperatingSystemInfo
              icon={WindowsIcon}
              os={"Windows"}
              version={check.windows?.min_kernel_version}
              versionText={"Kernel Version"}
              versionList={windowsKernelVersions}
            />
            <PostureCheckOperatingSystemInfo
              icon={AppleIcon}
              os={"macOS"}
              version={check.darwin?.min_version}
              versionList={macOSVersions}
            />
            <PostureCheckOperatingSystemInfo
              icon={IOSIcon}
              os={"iOS"}
              version={check.ios?.min_version}
              versionList={iOSVersions}
            />
            <PostureCheckOperatingSystemInfo
              icon={AndroidIcon}
              os={"Android"}
              version={check.android?.min_version}
              versionList={androidVersions}
            />
          </div>
        </div>
      }
    >
      {children}
    </FullTooltip>
  ) : (
    children
  );
};
