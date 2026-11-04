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
import { Mark } from "@components/ui/Mark";
import { IconInfoCircle } from "@tabler/icons-react";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { getNetBirdUpCommand, GRPC_API_ORIGIN } from "@utils/netbird";
import {
  CopyIcon,
  ExternalLinkIcon,
  KeyRoundIcon,
  Loader2,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
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
  style?: React.CSSProperties;
  // true = user device (mobile, no Docker), false = server (Docker plus key
  // generation), undefined = legacy heuristic keyed off setupKey.
  isUserDevice?: boolean;
  // Preset hostname for the install commands.
  hostname?: string;
  // Group ids auto-assigned to peers registering with the generated key.
  autoGroups?: string[];
  // Resolved when the key is generated; takes precedence over autoGroups.
  resolveAutoGroups?: () => Promise<string[]>;
  // Defaults to a timestamped name.
  keyName?: string;
  onSetupKeyGenerated?: (key: SetupKey) => void;
};

export default function SetupModal({
  showClose = true,
  user,
  setupKey,
  showOnlyRoutingPeerOS = false,
  className,
  style,
  isUserDevice,
  hostname,
  autoGroups,
  resolveAutoGroups,
  keyName,
  onSetupKeyGenerated,
}: Readonly<Props>) {
  return (
    <ModalContent
      showClose={showClose}
      className={cn(
        "outline-none focus:outline-none focus-visible:outline-none",
        className,
      )}
      style={style}
      data-testid={"setup-netbird-modal"}
    >
      <SetupModalContent
        user={user}
        setupKey={setupKey}
        showOnlyRoutingPeerOS={showOnlyRoutingPeerOS}
        isUserDevice={isUserDevice}
        hostname={hostname}
        autoGroups={autoGroups}
        resolveAutoGroups={resolveAutoGroups}
        keyName={keyName}
        onSetupKeyGenerated={onSetupKeyGenerated}
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
  autoGroups?: string[];
  resolveAutoGroups?: () => Promise<string[]>;
  keyName?: string;
  onSetupKeyGenerated?: (key: SetupKey) => void;
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
  autoGroups,
  resolveAutoGroups,
  keyName,
  onSetupKeyGenerated,
}: Readonly<SetupModalContentProps>) {
  const os = useOperatingSystem();
  const t = useTranslations("setupModal");
  const [isFirstRun] = useLocalStorage<boolean>("netbird-first-run", true);
  const pathname = usePathname();
  const isInstallPage = pathname === "/install";

  // Lifted here so every OS tab and the banner see the same generated key.
  const [generatedKey, setGeneratedKey] = useState<SetupKey | undefined>();
  const effectiveSetupKey = setupKey ?? generatedKey?.key;

  // Legacy callers that already have a setupKey (routing peers) hide mobile.
  const hideDocker = isUserDevice === true;
  const hideMobile = isUserDevice === false || !!setupKey;
  const showKeyGenerator = isUserDevice === false && !setupKey;

  // Keeps the `--setup-key SETUP_KEY` token visible before a key exists.
  const setupKeyPlaceholder = showKeyGenerator ? "SETUP_KEY" : undefined;

  const setupKeyContent = showKeyGenerator ? (
    <>
      <div className={"flex items-center gap-1.5 flex-wrap"}>
        {t("generateSetupKey")}
        <HelpTooltip
          content={t.rich("setupKeyHelpTooltip", {
            code: (chunks) => <code>{chunks}</code>,
          })}
        />
        <InlineLink
          href={
            "https://docs.netbird.io/how-to/register-machines-using-setup-keys"
          }
          target={"_blank"}
        >
          {t("learnMore")}
          <ExternalLinkIcon size={12} />
        </InlineLink>
      </div>
      <SetupKeyGenerator
        generatedKey={generatedKey}
        autoGroups={autoGroups}
        resolveAutoGroups={resolveAutoGroups}
        keyName={keyName}
        onGenerated={(key) => {
          setGeneratedKey(key);
          onSetupKeyGenerated?.(key);
        }}
      />
    </>
  ) : undefined;

  const titleMessage = useMemo(() => {
    if (title) return title;

    if (isFirstRun && !isInstallPage) {
      let name = user?.given_name || t("defaultUserName");
      return (
        <>
          {t("helloMessage", { name })} <br /> {t("timeToAddFirstDevice")}
        </>
      );
    }

    return effectiveSetupKey
      ? t("installNetBirdWithSetupKey")
      : t("installNetBird");
  }, [
    isFirstRun,
    isInstallPage,
    effectiveSetupKey,
    title,
    user?.given_name,
    t,
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
              ? t("getStartedWithSetupKey")
              : t("getStartedWithEmail")}
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
              {t("footerDescription")}{" "}
              <InlineLink
                href={
                  "https://docs.netbird.io/how-to/getting-started#installation"
                }
                target={"_blank"}
              >
                {t("installationGuide")}
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
  // Shown in place of a real key before one is generated.
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
  // Line-continuation char for the visual display (Unix "\", Windows cmd "^").
  // The copied command is always a clean single line.
  continuation?: string;
};

export const NetBirdUpCommand = ({
  setupKey,
  setupKeyPlaceholder,
  hostname,
  continuation = "\\",
}: NetBirdUpCommandProps) => {
  const keyValue = setupKey ?? setupKeyPlaceholder;
  const hasKey = !!keyValue;
  const hasHostname = !!hostname;

  // Single-line form for the clipboard, whatever the visual layout below.
  const copyCommand = [
    getNetBirdUpCommand(),
    hasKey && `--setup-key ${keyValue}`,
    hasHostname && `--hostname '${hostname}'`,
  ]
    .filter(Boolean)
    .join(" ");

  if (!hasKey && !hasHostname) {
    return (
      <Code codeToCopy={copyCommand}>
        <Code.Line>{getNetBirdUpCommand()}</Code.Line>
      </Code>
    );
  }

  return (
    <Code codeToCopy={copyCommand}>
      <Code.Line>
        {getNetBirdUpCommand()} {continuation}
      </Code.Line>
      {hasKey && (
        <Code.Line>
          {"  --setup-key "}
          <span className={"text-netbird"}>{keyValue}</span>
          {hasHostname && ` ${continuation}`}
        </Code.Line>
      )}
      {hasHostname && (
        <Code.Line>
          {"  --hostname "}
          <span className={"text-netbird"}>{`'${hostname}'`}</span>
        </Code.Line>
      )}
    </Code>
  );
};

type ManagementUrlStepProps = {
  // "System tray" on Windows, "menu bar" on macOS.
  trayName: string;
};

export const ManagementUrlStep = ({ trayName }: ManagementUrlStepProps) => {
  const t = useTranslations("setupModal");
  const Marked = (chunks: React.ReactNode) => <Mark>{chunks}</Mark>;
  return (
    <>
      <p>{t.rich("managementFirstLaunch", { Mark: Marked })}</p>
      <Code>
        <Code.Line>{GRPC_API_ORIGIN}</Code.Line>
      </Code>
      <p className={"mt-2 text-xs text-nb-gray-300 font-normal"}>
        {t.rich("managementSettings", {
          trayName: trayName === "menu bar" ? t("menuBar") : t("systemTray"),
          Mark: Marked,
        })}
      </p>
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
  const t = useTranslations("setupModal");
  return (
    <div
      className={
        "flex gap-2 mt-1 items-center text-xs text-nb-gray-300 font-normal mb-1"
      }
    >
      {t("setupKeyOnceMessage")}
      <br />
      {t("setupKeyExpiredMessage")}
    </div>
  );
};

type SetupKeyGeneratorProps = {
  generatedKey?: SetupKey;
  onGenerated: (key: SetupKey) => void;
  // Group ids auto-assigned to peers registering with this key.
  autoGroups?: string[];
  // Takes precedence over autoGroups.
  resolveAutoGroups?: () => Promise<string[]>;
  // Defaults to a timestamped one.
  keyName?: string;
};

function SetupKeyGenerator({
  generatedKey,
  onGenerated,
  autoGroups,
  resolveAutoGroups,
  keyName,
}: SetupKeyGeneratorProps) {
  const t = useTranslations("setupModal");
  const setupKeyRequest = useApiCall<SetupKey>("/setup-keys", true);
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = () => {
    setIsGenerating(true);
    // The "All" group can't be a setup-key auto-group, so send none unless
    // the caller supplies them.
    const request = (
      resolveAutoGroups
        ? resolveAutoGroups()
        : Promise.resolve(autoGroups ?? [])
    )
      .then((groupIds) =>
        setupKeyRequest.post({
          name: keyName || `Install setup key (${new Date().toLocaleString()})`,
          type: "one-off",
          expires_in: 24 * 60 * 60,
          revoked: false,
          auto_groups: groupIds ?? [],
          usage_limit: 1,
          ephemeral: false,
          allow_extra_dns_labels: false,
        }),
      )
      .then((created) => {
        onGenerated(created);
        return created;
      })
      .finally(() => setIsGenerating(false));

    notify({
      title: t("setupKeyCreated"),
      description: t("setupKeyCreatedDescription"),
      loadingMessage: t("generatingSetupKey"),
      promise: request,
    });
  };

  const copy = async () => {
    if (!generatedKey?.key) return;
    try {
      await navigator.clipboard.writeText(generatedKey.key);
      notify({
        title: t("setupKeyCopied"),
        description: t("setupKeyCopiedDescription"),
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
          data-testid={"setup-generate-key"}
        >
          {isGenerating ? (
            <Loader2 size={14} className={"animate-spin"} />
          ) : (
            <KeyRoundIcon size={14} />
          )}
          {t("generateKey")}
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
          {t("setupKey")}
        </div>
        <div
          className={"text-nb-gray-300 text-[0.8rem] text-left mt-0.5 truncate"}
        >
          {generatedKey.key}
        </div>
        <div
          className={"text-nb-gray-400 text-[0.72rem] flex items-center gap-1"}
        >
          {t("setupKeyExpiryMessage")}
        </div>
      </div>
      <Button variant={"secondary"} onClick={copy}>
        <CopyIcon size={14} />
      </Button>
    </div>
  );
}
