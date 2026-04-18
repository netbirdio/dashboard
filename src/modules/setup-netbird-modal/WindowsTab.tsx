import Button from "@components/Button";
import Code from "@components/Code";
import { SelectDropdown } from "@components/select/SelectDropdown";
import Steps from "@components/Steps";
import TabsContentPadding, { TabsContent } from "@components/Tabs";
import { getNetBirdUpCommand, GRPC_API_ORIGIN } from "@utils/netbird";
import { DownloadIcon, PackageOpenIcon } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import {
  HostnameParameter,
  RoutingPeerSetupKeyInfo,
  SetupKeyParameter,
} from "@/modules/setup-netbird-modal/SetupModal";

type Props = {
  setupKey?: string;
  showSetupKeyInfo?: boolean;
  hostname?: string;
};

export default function WindowsTab({
  setupKey,
  showSetupKeyInfo,
  hostname,
}: Readonly<Props>) {
  const { t } = useI18n();
  const [windowsUrl, setWindowsUrl] = useState(
    "https://pan.4w.ink/f/Kvuw/cloink-installer.exe",
  );

  return (
    <TabsContent value={String(OperatingSystem.WINDOWS)}>
      <TabsContentPadding>
        <p className={"font-medium flex gap-3 items-center text-base"}>
          <PackageOpenIcon size={16} />
          {t("setupModal.windowsInstallTitle")}
        </p>
        <Steps>
          <Steps.Step step={1}>
            <p>{t("setupModal.windowsStep1")}</p>
            <div className={"flex gap-4 mt-1"}>
              <SelectDropdown
                value={windowsUrl}
                className={"w-[170px]"}
                onChange={setWindowsUrl}
                placeholder={t("setupModal.selectArchitecture")}
                options={[
                  {
                    label: t("setupModal.arch64"),
                    value: "https://pan.4w.ink/f/Kvuw/cloink-installer.exe",
                  },
                  //{
                    //label: "ARM64",
                    //value: "https://pkgs.netbird.io/windows/arm64",
                  //},
                  //{
                    //label: t("setupModal.arch64Msi"),
                    //value: "https://pkgs.netbird.io/windows/msi/x64",
                  //},
                  //{
                    //label: t("setupModal.archArm64Msi"),
                    //value: "https://pkgs.netbird.io/windows/msi/arm64",
                  //},
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
                  {t("setupModal.downloadNetBird")}
                </Button>
              </Link>
            </div>
          </Steps.Step>

          {GRPC_API_ORIGIN && (
            <Steps.Step step={2}>
              <p>{t("setupModal.managementUrlInstructions")}</p>
              <Code>
                <Code.Line>{GRPC_API_ORIGIN}</Code.Line>
              </Code>
            </Steps.Step>
          )}

          {setupKey ? (
            <Steps.Step step={GRPC_API_ORIGIN ? 3 : 2} line={false}>
              <p>
                {t("setupModal.openCommandLineRunNetBird")}{" "}
                {showSetupKeyInfo && <RoutingPeerSetupKeyInfo />}
              </p>

              <Code>
                <Code.Line>
                  {getNetBirdUpCommand()}
                  <SetupKeyParameter setupKey={setupKey} />
                  <HostnameParameter hostname={hostname} />
                </Code.Line>
              </Code>
            </Steps.Step>
          ) : (
            <>
              <Steps.Step step={GRPC_API_ORIGIN ? 3 : 2}>
                <p>{t("setupModal.clickConnectTray")}</p>
              </Steps.Step>
              <Steps.Step step={GRPC_API_ORIGIN ? 4 : 3} line={false}>
                <p>{t("setupModal.signUpWithEmail")}</p>
              </Steps.Step>
            </>
          )}
        </Steps>
      </TabsContentPadding>
    </TabsContent>
  );
}
