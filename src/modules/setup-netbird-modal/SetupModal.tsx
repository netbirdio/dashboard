"use client";

import InlineLink from "@components/InlineLink";
import { ModalContent, ModalFooter } from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import SmallParagraph from "@components/SmallParagraph";
import { Tabs, TabsList, TabsTrigger } from "@components/Tabs";
import React from "react";
import AndroidIcon from "@/assets/icons/AndroidIcon";
import AppleIcon from "@/assets/icons/AppleIcon";
import DockerIcon from "@/assets/icons/DockerIcon";
import IOSIcon from "@/assets/icons/IOSIcon";
import ShellIcon from "@/assets/icons/ShellIcon";
import WindowsIcon from "@/assets/icons/WindowsIcon";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import useOperatingSystem from "@/hooks/useOperatingSystem";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import AndroidTab from "@/modules/setup-netbird-modal/AndroidTab";
import DockerTab from "@/modules/setup-netbird-modal/DockerTab";
import IOSTab from "@/modules/setup-netbird-modal/IOSTab";
import LinuxTab from "@/modules/setup-netbird-modal/LinuxTab";
import MacOSTab from "@/modules/setup-netbird-modal/MacOSTab";
import WindowsTab from "@/modules/setup-netbird-modal/WindowsTab";

type OidcUserInfo = {
  given_name?: string;
};

type Props = {
  showClose?: boolean;
  user?: OidcUserInfo;
};

export default function SetupModal({ showClose = true, user }: Props) {
  const os = useOperatingSystem();

  const [isFirstRun] = useLocalStorage<boolean>("netbird-first-run", true);

  return (
    <ModalContent showClose={showClose}>
      <div className={"text-center pb-8 pt-4 px-8"}>
        <h2 className={"text-3xl max-w-lg mx-auto"}>
          {isFirstRun ? (
            <>
              Hello {user?.given_name || "there"}! 👋 <br />
              {`It's time to add your first device.`}
            </>
          ) : (
            <>Add new peer</>
          )}
        </h2>
        <Paragraph className={"max-w-xs mx-auto mt-3"}>
          To get started, install NetBird and log in using your email account.
        </Paragraph>
      </div>
      <Tabs defaultValue={String(os)}>
        <TabsList>
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
          <TabsTrigger value={String(OperatingSystem.DOCKER)}>
            <DockerIcon
              className={
                "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all"
              }
            />
            Docker
          </TabsTrigger>
        </TabsList>
        <LinuxTab />
        <WindowsTab />
        <MacOSTab />
        <AndroidTab />
        <IOSTab />
        <DockerTab />
      </Tabs>
      <ModalFooter variant={"setup"}>
        <div>
          <SmallParagraph>
            After that you should be connected. Add more devices to your network
            or manage your existing devices in the admin panel. If you have
            further questions check out our{" "}
            <InlineLink
              href={
                "https://docs.netbird.io/how-to/getting-started#installation"
              }
              target={"_blank"}
            >
              installation guide.
            </InlineLink>
          </SmallParagraph>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
