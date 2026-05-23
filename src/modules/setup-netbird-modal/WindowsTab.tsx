import Button from "@components/Button";
import Code from "@components/Code";
import { SelectDropdown } from "@components/select/SelectDropdown";
import Steps from "@components/Steps";
import TabsContentPadding, { TabsContent } from "@components/Tabs";
import { GRPC_API_ORIGIN } from "@utils/netbird";
import { DownloadIcon, PackageOpenIcon } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import {
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
  const [windowsUrl, setWindowsUrl] = useState(
    "https://pkgs.netbird.io/windows/x64",
  );
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
          Install on Windows
        </p>
        <Steps>
          <Steps.Step step={1}>
            <p>Download and run Windows Installer</p>
            <div className={"flex gap-4 mt-1"}>
              <SelectDropdown
                value={windowsUrl}
                className={"w-[170px]"}
                onChange={setWindowsUrl}
                placeholder={"Select architecture"}
                options={[
                  {
                    label: "64-Bit",
                    value: "https://pkgs.netbird.io/windows/x64",
                  },
                  {
                    label: "ARM64",
                    value: "https://pkgs.netbird.io/windows/arm64",
                  },
                  {
                    label: "64-Bit (MSI)",
                    value: "https://pkgs.netbird.io/windows/msi/x64",
                  },
                  {
                    label: "ARM64 (MSI)",
                    value: "https://pkgs.netbird.io/windows/msi/arm64",
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
                  Download NetBird
                </Button>
              </Link>
            </div>
          </Steps.Step>

          {GRPC_API_ORIGIN && (
            <Steps.Step step={baseMgmtStep}>
              <p>
                {`Click on "Settings" then "Advanced Settings" from the NetBird icon in your system tray and enter the following "Management URL"`}
              </p>
              <Code>
                <Code.Line>{GRPC_API_ORIGIN}</Code.Line>
              </Code>
            </Steps.Step>
          )}

          {setupKeyContent && (
            <Steps.Step step={keyStep}>{setupKeyContent}</Steps.Step>
          )}

          {useCliRun ? (
            <Steps.Step step={runStep} line={false}>
              <p>
                Open Command-line and run NetBird{" "}
                {showSetupKeyInfo && <RoutingPeerSetupKeyInfo />}
              </p>

              <Code>
                <NetBirdUpCommand
                  setupKey={setupKey}
                  setupKeyPlaceholder={setupKeyPlaceholder}
                  hostname={hostname}
                />
              </Code>
            </Steps.Step>
          ) : (
            <>
              <Steps.Step step={runStep}>
                <p>
                  {/* eslint-disable-next-line react/no-unescaped-entities */}
                  Click on "Connect" from the NetBird icon in your system tray
                </p>
              </Steps.Step>
              <Steps.Step step={runStep + 1} line={false}>
                <p>Sign up using your email address</p>
              </Steps.Step>
            </>
          )}
        </Steps>
      </TabsContentPadding>
    </TabsContent>
  );
}
