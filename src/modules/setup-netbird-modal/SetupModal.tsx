"use client";

import InlineLink from "@components/InlineLink";
import { ModalContent, ModalFooter } from "@components/modal/Modal";
import Paragraph from "@components/Paragraph";
import SmallParagraph from "@components/SmallParagraph";
import { Tabs, TabsList, TabsTrigger } from "@components/Tabs";
import { cn } from "@utils/helpers";
import { ExternalLinkIcon } from "lucide-react";
import { usePathname } from "next/navigation";
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
  setupKey?: string;
  showOnlyRoutingPeerOS?: boolean;
};

export default function SetupModal({
  showClose = true,
  user,
  setupKey,
  showOnlyRoutingPeerOS = false,
}: Readonly<Props>) {
  return (
    <ModalContent showClose={showClose}>
      <SetupModalContent
        user={user}
        setupKey={setupKey}
        showOnlyRoutingPeerOS={showOnlyRoutingPeerOS}
      />
    </ModalContent>
  );
}

type SetupModalContentProps = {
  user?: OidcUserInfo;
  header?: boolean;
  footer?: boolean;
  tabAlignment?: "center" | "start" | "end";
  setupKey?: string;
  showOnlyRoutingPeerOS?: boolean;
};

export function SetupModalContent({
  user,
  header = true,
  footer = true,
  tabAlignment = "center",
  setupKey,
  showOnlyRoutingPeerOS,
}: Readonly<SetupModalContentProps>) {
  const os = useOperatingSystem();
  const [isFirstRun] = useLocalStorage<boolean>("netbird-first-run", true);
  const pathname = usePathname();
  const isInstallPage = pathname === "/install";

  return (
    <>
      {header && (
        <div className={"text-center pb-5 pt-4 px-8"}>
          <h2
            className={cn(
              "max-w-lg mx-auto",
              setupKey ? "text-2xl" : "text-3xl",
            )}
          >
            {isFirstRun && !isInstallPage ? (
              <>
                Hello {user?.given_name || "there"}! 👋 <br />
                {`It's time to add your first device.`}
              </>
            ) : (
              <>Install NetBird{setupKey && " with Setup Key"}</>
            )}
          </h2>
          <Paragraph
            className={cn("mx-auto mt-3", setupKey ? "max-w-sm" : "max-w-xs")}
          >
            {setupKey
              ? "To get started, install and run NetBird with the setup key as a parameter."
              : "To get started, install NetBird and log in with your email account."}
          </Paragraph>
        </div>
      )}

      <Tabs defaultValue={String(setupKey ? OperatingSystem.LINUX : os)}>
        <TabsList justify={tabAlignment} className={"pt-2 px-3"}>
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

          {!setupKey && (
            <>
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
            </>
          )}

          <TabsTrigger value={String(OperatingSystem.DOCKER)}>
            <DockerIcon
              className={
                "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all"
              }
            />
            Docker
          </TabsTrigger>
        </TabsList>

        <LinuxTab
          setupKey={setupKey}
          showSetupKeyInfo={showOnlyRoutingPeerOS}
        />
        <WindowsTab
          setupKey={setupKey}
          showSetupKeyInfo={showOnlyRoutingPeerOS}
        />
        <MacOSTab
          setupKey={setupKey}
          showSetupKeyInfo={showOnlyRoutingPeerOS}
        />

        {!setupKey && (
          <>
            <AndroidTab />
            <IOSTab />
          </>
        )}

        <DockerTab
          setupKey={setupKey}
          showSetupKeyInfo={showOnlyRoutingPeerOS}
        />
      </Tabs>
      {footer && (
        <ModalFooter variant={"setup"}>
          <div>
            <SmallParagraph>
              After that you should be connected. Add more devices to your
              network or manage your existing devices in the admin panel. If you
              have further questions check out our{" "}
              <InlineLink
                href={
                  "https://docs.netbird.io/how-to/getting-started#installation"
                }
                target={"_blank"}
              >
                Installation Guide
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </SmallParagraph>
          </div>
        </ModalFooter>
      )}
    </>
  );
}

type SetupKeyParameterProps = {
  setupKey?: string;
};

export const SetupKeyParameter = ({ setupKey }: SetupKeyParameterProps) => {
  return (
    setupKey && (
      <>
        {" "}
        --setup-key <span className={"text-highlight"}>{setupKey}</span>
      </>
    )
  );
};

export const RoutingPeerSetupKeyInfo = () => {
  return (
    <div
      className={
        "flex gap-2 mt-1 items-center text-xs text-nb-gray-300 font-normal mb-1"
      }
    >
      This setup key can be used only once within the next 24 hours.
      <br />
      When expired, the same key can not be used again.
    </div>
  );
};
