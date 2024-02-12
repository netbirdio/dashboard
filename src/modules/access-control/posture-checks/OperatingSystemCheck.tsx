import Button from "@components/Button";
import InlineLink from "@components/InlineLink";
import { ModalClose, ModalFooter } from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { HoverModalCard } from "@components/ui/HoverModalCard";
import { Disc3Icon, ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import AndroidIcon from "@/assets/icons/AndroidIcon";
import AppleIcon from "@/assets/icons/AppleIcon";
import IOSIcon from "@/assets/icons/IOSIcon";
import ShellIcon from "@/assets/icons/ShellIcon";
import WindowsIcon from "@/assets/icons/WindowsIcon";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import {
  androidVersions,
  iOSVersions,
  macOSVersions,
  OperatingSystemVersionCheck,
  windowsKernelVersions,
} from "@/interfaces/PostureCheck";
import { OperatingSystemPostureCheck } from "@/modules/access-control/posture-checks/OperatingSystemPostureCheck";

type Props = {
  value?: OperatingSystemVersionCheck;
  onChange: (value: OperatingSystemVersionCheck | undefined) => void;
};

export const OperatingSystemCheck = ({ value, onChange }: Props) => {
  const [open, setOpen] = useState(false);

  console.log("OperatingSystemCheck", value);
  return (
    <HoverModalCard
      open={open}
      setOpen={setOpen}
      value={"os"}
      key={open ? 1 : 0}
      icon={<Disc3Icon size={16} />}
      title={"Operating System"}
      modalWidthClass={"max-w-xl"}
      description={
        "Restrict access in your network based on the operating system."
      }
      iconClass={"bg-gradient-to-tr from-nb-gray-500 to-nb-gray-300"}
    >
      <CheckContent
        value={value}
        onChange={(v) => {
          onChange(v);
          setOpen(false);
        }}
      />
    </HoverModalCard>
  );
};

const CheckContent = ({ value, onChange }: Props) => {
  const [tab, setTab] = useState(String(OperatingSystem.LINUX));

  const [windowsVersion, setWindowsVersion] = useState<string | undefined>(
    value ? value.windows?.min_kernel_version : "",
  );
  const [macOSVersion, setMacOSVersion] = useState<string | undefined>(
    value ? value.darwin?.min_version : "",
  );
  const [androidVersion, setAndroidVersion] = useState<string | undefined>(
    value ? value.android?.min_version : "",
  );
  const [iOSVersion, setIOSVersion] = useState<string | undefined>(
    value ? value.ios?.min_version : "",
  );
  const [linuxVersion, setLinuxVersion] = useState<string | undefined>(
    value ? value.linux?.min_kernel_version : "",
  );

  console.log(
    "CheckContent",
    value,
    windowsVersion,
    macOSVersion,
    androidVersion,
    iOSVersion,
    linuxVersion,
  );

  return (
    <>
      <Tabs defaultValue={tab}>
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger value={String(OperatingSystem.LINUX)}>
            <ShellIcon
              className={
                "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all"
              }
            />
            Linux
          </TabsTrigger>
          <TabsTrigger value={String(OperatingSystem.WINDOWS)}>
            <WindowsIcon
              className={
                "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all"
              }
            />
            Windows
          </TabsTrigger>
          <TabsTrigger value={String(OperatingSystem.APPLE)}>
            <AppleIcon
              className={
                "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all"
              }
            />
            macOS
          </TabsTrigger>
          <TabsTrigger value={String(OperatingSystem.IOS)}>
            <IOSIcon
              className={
                "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all"
              }
            />
            iOS
          </TabsTrigger>
          <TabsTrigger value={String(OperatingSystem.ANDROID)}>
            <AndroidIcon
              className={
                "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all"
              }
            />
            Android
          </TabsTrigger>
        </TabsList>
        <TabsContent value={String(OperatingSystem.LINUX)} className={"px-8"}>
          <OperatingSystemPostureCheck
            value={linuxVersion}
            onChange={setLinuxVersion}
            os={OperatingSystem.LINUX}
          />
        </TabsContent>
        <TabsContent value={String(OperatingSystem.WINDOWS)} className={"px-8"}>
          <OperatingSystemPostureCheck
            versionList={windowsKernelVersions}
            value={windowsVersion}
            onChange={setWindowsVersion}
            os={OperatingSystem.WINDOWS}
          />
        </TabsContent>
        <TabsContent value={String(OperatingSystem.APPLE)} className={"px-8"}>
          <OperatingSystemPostureCheck
            versionList={macOSVersions}
            value={macOSVersion}
            onChange={setMacOSVersion}
            os={OperatingSystem.APPLE}
          />
        </TabsContent>
        <TabsContent value={String(OperatingSystem.IOS)} className={"px-8"}>
          <OperatingSystemPostureCheck
            versionList={iOSVersions}
            value={iOSVersion}
            onChange={setIOSVersion}
            os={OperatingSystem.IOS}
          />
        </TabsContent>
        <TabsContent value={String(OperatingSystem.ANDROID)} className={"px-8"}>
          <OperatingSystemPostureCheck
            versionList={androidVersions}
            value={androidVersion}
            onChange={setAndroidVersion}
            os={OperatingSystem.ANDROID}
          />
        </TabsContent>
      </Tabs>
      <div className={"h-6"}></div>
      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink href={"#"} target={"_blank"}>
              Operating System Check
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>Cancel</Button>
          </ModalClose>
          <Button
            variant={"primary"}
            onClick={() => {
              onChange({
                windows:
                  windowsVersion && windowsVersion !== ""
                    ? { min_kernel_version: windowsVersion }
                    : undefined,
                darwin:
                  macOSVersion && macOSVersion !== ""
                    ? { min_version: macOSVersion }
                    : undefined,
                android:
                  androidVersion && androidVersion !== ""
                    ? { min_version: androidVersion }
                    : undefined,
                ios:
                  iOSVersion && iOSVersion !== ""
                    ? { min_version: iOSVersion }
                    : undefined,
                linux:
                  linuxVersion && linuxVersion !== ""
                    ? { min_kernel_version: linuxVersion }
                    : undefined,
              });
            }}
          >
            Save
          </Button>
        </div>
      </ModalFooter>
    </>
  );
};
