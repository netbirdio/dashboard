import Button from "@components/Button";
import { SelectDropdown } from "@components/select/SelectDropdown";
import Steps from "@components/Steps";
import TabsContentPadding, { TabsContent } from "@components/Tabs";
import { GRPC_API_ORIGIN, pkgsDownloadUrl } from "@utils/netbird";
import { DownloadIcon, PackageOpenIcon } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { useTranslations } from "@/i18n/LocaleProvider";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import {
  ManagementUrlStep,
  NetBirdUpCommand,
  RoutingPeerSetupKeyInfo,
} from "@/modules/setup-netbird-modal/SetupModal";

type Props = {
  setupKey?: string;
  setupKeyContent?: React.ReactNode;
  setupKeyPlaceholder?: string;
  showSetupKeyInfo?: boolean;
  hostname?: string;
};

export default function WindowsTab({
  setupKey,
  setupKeyContent,
  setupKeyPlaceholder,
  showSetupKeyInfo,
  hostname,
}: Readonly<Props>) {
  const t = useTranslations();
  const [windowsUrl, setWindowsUrl] = useState(pkgsDownloadUrl("windows/x64"));
  // The CLI-run branch is required for the server flow (setupKeyContent
  // present) even before a key is generated — the placeholder keeps the
  // command shape consistent. Otherwise we fall back to the existing
  // setupKey-driven branching.
  const useCliRun = !!setupKey || !!setupKeyContent;
  const baseMgmtStep = 2;
  const keyStep = GRPC_API_ORIGIN ? 3 : 2;
  const runStep = keyStep + (setupKeyContent ? 1 : 0);
  return (
    <TabsContent value={String(OperatingSystem.WINDOWS)}>
      <TabsContentPadding>
        <p className={"font-medium flex gap-3 items-center text-base"}>
          <PackageOpenIcon size={16} />
          {t("setupNetbirdModal.installOnWindows")}
        </p>
        <Steps>
          <Steps.Step step={1}>
            <p>{t("setupNetbirdModal.downloadWindowsInstaller")}</p>
            <div className={"flex gap-4 mt-1"}>
              <SelectDropdown
                value={windowsUrl}
                className={"w-[170px]"}
                onChange={setWindowsUrl}
                placeholder={t("setupNetbirdModal.selectArchitecture")}
                options={[
                  {
                    label: "64-Bit",
                    value: pkgsDownloadUrl("windows/x64"),
                  },
                  {
                    label: "ARM64",
                    value: pkgsDownloadUrl("windows/arm64"),
                  },
                  {
                    label: "64-Bit (MSI)",
                    value: pkgsDownloadUrl("windows/msi/x64"),
                  },
                  {
                    label: "ARM64 (MSI)",
                    value: pkgsDownloadUrl("windows/msi/arm64"),
                  },
                ]}
              />
              <Link
                href={windowsUrl}
                passHref
                target={"_blank"}
                rel="noopener noreferrer"
              >
                <Button variant={"primary"}>
                  <DownloadIcon size={14} />
                  {t("setupNetbirdModal.downloadNetBird")}
                </Button>
              </Link>
            </div>
          </Steps.Step>

          {GRPC_API_ORIGIN && (
            <Steps.Step step={baseMgmtStep}>
              <ManagementUrlStep trayName={"system tray"} />
            </Steps.Step>
          )}

          {setupKeyContent && (
            <Steps.Step step={keyStep}>{setupKeyContent}</Steps.Step>
          )}

          {useCliRun ? (
            <Steps.Step step={runStep} line={false}>
              <p>
                {t("setupNetbirdModal.openCmdAndRun")}{" "}
                {showSetupKeyInfo && <RoutingPeerSetupKeyInfo />}
              </p>

              <NetBirdUpCommand
                setupKey={setupKey}
                setupKeyPlaceholder={setupKeyPlaceholder}
                hostname={hostname}
                continuation={"^"}
              />
            </Steps.Step>
          ) : (
            <>
              <Steps.Step step={runStep}>
                <p>
                  {/* eslint-disable-next-line react/no-unescaped-entities */}
                  {t("setupNetbirdModal.clickConnectTray")}
                </p>
              </Steps.Step>
              <Steps.Step step={runStep + 1} line={false}>
                <p>{t("setupNetbirdModal.signUpWithEmail")}</p>
              </Steps.Step>
            </>
          )}
        </Steps>
      </TabsContentPadding>
    </TabsContent>
  );
}
