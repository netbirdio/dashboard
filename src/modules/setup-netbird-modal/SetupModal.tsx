"use client";

import Button from "@components/Button";
import Code from "@components/Code";
import { HelpTooltip } from "@components/HelpTooltip";
import InlineLink from "@components/InlineLink";
import { ModalContent, ModalFooter } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import SmallParagraph from "@components/SmallParagraph";
import { Tabs, TabsList, TabsTrigger } from "@components/Tabs";
import { IconInfoCircle } from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { getNetBirdUpCommand } from "@utils/netbird";
import {
  CopyIcon,
  ExternalLinkIcon,
  KeyRoundIcon,
  Loader2,
} from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useMemo, useState } from "react";
import AndroidIcon from "@/assets/icons/AndroidIcon";
import AppleIcon from "@/assets/icons/AppleIcon";
import DockerIcon from "@/assets/icons/DockerIcon";
import IOSIcon from "@/assets/icons/IOSIcon";
import ShellIcon from "@/assets/icons/ShellIcon";
import WindowsIcon from "@/assets/icons/WindowsIcon";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import useOperatingSystem from "@/hooks/useOperatingSystem";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { SetupKey } from "@/interfaces/SetupKey";
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
  className?: string;
  // Tri-state audience selector:
  //   true      – user device (laptop/phone): mobile shown, Docker hidden.
  //   false     – server: mobile hidden, Docker shown, key-generation UI.
  //   undefined – legacy: keep historical heuristic (mobile shown unless
  //               a setupKey is already provided; Docker shown).
  isUserDevice?: boolean;
};

export default function SetupModal({
  showClose = true,
  user,
  setupKey,
  showOnlyRoutingPeerOS = false,
  className,
  isUserDevice,
}: Readonly<Props>) {
  return (
    <ModalContent showClose={showClose} className={className}>
      <SetupModalContent
        user={user}
        setupKey={setupKey}
        showOnlyRoutingPeerOS={showOnlyRoutingPeerOS}
        isUserDevice={isUserDevice}
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
  title?: string;
  hostname?: string;
  isUserDevice?: boolean;
};

export function SetupModalContent({
  user,
  header = true,
  footer = true,
  tabAlignment = "center",
  setupKey,
  showOnlyRoutingPeerOS,
  title,
  hostname,
  isUserDevice,
}: Readonly<SetupModalContentProps>) {
  const os = useOperatingSystem();
  const [isFirstRun] = useLocalStorage<boolean>("netbird-first-run", true);
  const pathname = usePathname();
  const isInstallPage = pathname === "/install";

  // Server flow generates its own setup key when the caller hasn't
  // supplied one. The generated value lives here so the OS tabs and
  // the in-modal banner stay in sync.
  const [generatedKey, setGeneratedKey] = useState<SetupKey | undefined>();
  const effectiveSetupKey = setupKey ?? generatedKey?.key;

  // Visibility rules:
  //   hideDocker  – only when explicitly a user-device flow.
  //   hideMobile  – server flow (explicit false), or legacy callers
  //                 that already have a setupKey (routing peers etc.).
  //   showKeyGen  – server flow, and the caller didn't pre-supply a key.
  const hideDocker = isUserDevice === true;
  const hideMobile = isUserDevice === false || !!setupKey;
  const showKeyGenerator = isUserDevice === false && !setupKey;

  // setupKeyPlaceholder keeps the `--setup-key SETUP_KEY` token visible
  // in each OS tab before the operator clicks Generate, so the command
  // reads as "this is where the value goes".
  const setupKeyPlaceholder = showKeyGenerator ? "SETUP_KEY" : undefined;

  // The setup-key generation banner is rendered as its own Step inside
  // each OS tab. The state lives in the parent so all tabs see the
  // same generated key (and the command updates everywhere).
  const setupKeyContent = showKeyGenerator ? (
    <>
      <div className={"flex items-center gap-1.5 flex-wrap"}>
        Generate a setup key
        <HelpTooltip
          content={
            <>
              A setup key is a one-time, pre-authentication token used to
              enroll an unattended machine with NetBird. Pass it to{" "}
              <code>netbird up</code> via <code>--setup-key</code> and the
              peer registers without an interactive login.
            </>
          }
        />
        <InlineLink
          href={
            "https://docs.netbird.io/how-to/register-machines-using-setup-keys"
          }
          target={"_blank"}
        >
          Learn more
          <ExternalLinkIcon size={12} />
        </InlineLink>
      </div>
      <SetupKeyGenerator
        generatedKey={generatedKey}
        onGenerated={setGeneratedKey}
      />
    </>
  ) : undefined;

  const titleMessage = useMemo(() => {
    if (title) return title;

    if (isFirstRun && !isInstallPage) {
      let name = user?.given_name || "there";
      return (
        <>
          Hello {name}! 👋 <br /> It&apos;s time to add your first device.
        </>
      );
    }

    return effectiveSetupKey
      ? "Install NetBird with Setup Key"
      : "Install NetBird";
  }, [
    isFirstRun,
    isInstallPage,
    effectiveSetupKey,
    title,
    user?.given_name,
  ]);

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
            {titleMessage}
          </h2>
          <Paragraph
            className={cn(
              "mx-auto mt-3",
              effectiveSetupKey ? "max-w-sm" : "max-w-xs",
            )}
          >
            {isUserDevice === false || effectiveSetupKey
              ? "To get started, install and run NetBird with the setup key as a parameter."
              : "To get started, install NetBird and log in with your email account."}
          </Paragraph>
        </div>
      )}

      <Tabs
        defaultValue={String(
          isUserDevice === false || setupKey ? OperatingSystem.LINUX : os,
        )}
      >
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

          {!hideMobile && (
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

          {!hideDocker && (
            <TabsTrigger value={String(OperatingSystem.DOCKER)}>
              <DockerIcon
                className={
                  "fill-nb-gray-500 group-data-[state=active]/trigger:fill-netbird transition-all"
                }
              />
              Docker
            </TabsTrigger>
          )}
        </TabsList>

        <LinuxTab
          setupKey={effectiveSetupKey}
          setupKeyContent={setupKeyContent}
          setupKeyPlaceholder={setupKeyPlaceholder}
          showSetupKeyInfo={showOnlyRoutingPeerOS}
          hostname={hostname}
        />
        <WindowsTab
          setupKey={effectiveSetupKey}
          setupKeyContent={setupKeyContent}
          setupKeyPlaceholder={setupKeyPlaceholder}
          showSetupKeyInfo={showOnlyRoutingPeerOS}
          hostname={hostname}
        />
        <MacOSTab
          setupKey={effectiveSetupKey}
          setupKeyContent={setupKeyContent}
          setupKeyPlaceholder={setupKeyPlaceholder}
          showSetupKeyInfo={showOnlyRoutingPeerOS}
          hostname={hostname}
        />

        {!hideMobile && (
          <>
            <AndroidTab />
            <IOSTab />
          </>
        )}

        {!hideDocker && (
          <DockerTab
            setupKey={effectiveSetupKey}
            setupKeyContent={setupKeyContent}
            setupKeyPlaceholder={setupKeyPlaceholder}
            showSetupKeyInfo={showOnlyRoutingPeerOS}
            hostname={hostname}
          />
        )}
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
  // Rendered in place of a real key — keeps the `--setup-key` token in
  // view before the operator has generated one. Style matches the real
  // key so the command reads as "this is where the value goes".
  placeholder?: string;
};

export const SetupKeyParameter = ({
  setupKey,
  placeholder,
}: SetupKeyParameterProps) => {
  const display = setupKey ?? placeholder;
  if (!display) return null;
  return (
    <>
      {" "}
      --setup-key <span className={"text-netbird"}>{display}</span>
    </>
  );
};

type NetBirdUpCommandProps = {
  setupKey?: string;
  setupKeyPlaceholder?: string;
  hostname?: string;
};

// NetBirdUpCommand renders `netbird up` inside a <Code> block. When
// extra flags are present it splits across multiple lines with shell
// continuations so long commands stay readable and still copy/paste
// cleanly into a terminal.
export const NetBirdUpCommand = ({
  setupKey,
  setupKeyPlaceholder,
  hostname,
}: NetBirdUpCommandProps) => {
  const keyValue = setupKey ?? setupKeyPlaceholder;
  const hasKey = !!keyValue;
  const hasHostname = !!hostname;

  if (!hasKey && !hasHostname) {
    return <Code.Line>{getNetBirdUpCommand()}</Code.Line>;
  }

  return (
    <>
      <Code.Line>{getNetBirdUpCommand()} \</Code.Line>
      {hasKey && (
        <Code.Line>
          {"  --setup-key "}
          <span className={"text-netbird"}>{keyValue}</span>
          {hasHostname && " \\"}
        </Code.Line>
      )}
      {hasHostname && (
        <Code.Line>
          {"  --hostname "}
          <span className={"text-netbird"}>{`'${hostname}'`}</span>
        </Code.Line>
      )}
    </>
  );
};

export const HostnameParameter = ({ hostname }: { hostname?: string }) => {
  return (
    hostname && (
      <>
        {" "}
        --hostname{" "}
        <span className={"text-netbird"}>
          {"'"}
          {hostname}
          {"'"}
        </span>
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

type SetupKeyGeneratorProps = {
  generatedKey?: SetupKey;
  onGenerated: (key: SetupKey) => void;
};

// SetupKeyGenerator renders the inline banner that lets the operator
// create a one-off setup key without leaving the install modal. The
// resulting key is lifted to the parent so the OS tabs can splice it
// into the `netbird up --setup-key=...` command.
function SetupKeyGenerator({
  generatedKey,
  onGenerated,
}: SetupKeyGeneratorProps) {
  const setupKeyRequest = useApiCall<SetupKey>("/setup-keys", true);
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = () => {
    setIsGenerating(true);
    // No auto_groups: the "All" group can't be a setup-key auto-group,
    // and we don't want to invent a default group on the operator's
    // behalf here. They can edit the key afterwards if they want.
    const request = setupKeyRequest
      .post({
        name: `Install setup key (${new Date().toLocaleString()})`,
        type: "one-off",
        expires_in: 24 * 60 * 60,
        revoked: false,
        auto_groups: [],
        usage_limit: 1,
        ephemeral: false,
        allow_extra_dns_labels: false,
      })
      .then((created) => {
        onGenerated(created);
        return created;
      })
      .finally(() => setIsGenerating(false));

    notify({
      title: "Setup Key Created",
      description: "A one-off setup key was generated for this install.",
      loadingMessage: "Generating setup key...",
      promise: request,
    });
  };

  const copy = async () => {
    if (!generatedKey?.key) return;
    try {
      await navigator.clipboard.writeText(generatedKey.key);
      notify({
        title: "Setup Key Copied",
        description: "Successfully copied to clipboard.",
      });
    } catch {}
  };

  if (!generatedKey) {
    return (
      <div className={"mt-2"}>
        <Button
          variant={"primary"}
          onClick={generate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 size={14} className={"animate-spin"} />
          ) : (
            <KeyRoundIcon size={14} />
          )}
          Generate Key
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex justify-between items-center rounded-lg border border-nb-gray-900 px-5 py-3 mt-2",
      )}
    >
      <div className={"min-w-0"}>
        <div
          className={
            "text-nb-gray-100 font-normal text-sm flex items-center gap-2"
          }
        >
          <KeyRoundIcon size={12} />
          Setup Key
        </div>
        <div
          className={"text-nb-gray-300 text-[0.8rem] text-left mt-0.5 truncate"}
        >
          {generatedKey.key}
        </div>
        <div
          className={
            "text-nb-gray-400 text-[0.72rem] flex items-center gap-1"
          }
        >

          This setup key can be used only once and expires in 24 hours.
        </div>
      </div>
      <Button variant={"secondary"} onClick={copy}>
        <CopyIcon size={14} />
      </Button>
    </div>
  );
}
