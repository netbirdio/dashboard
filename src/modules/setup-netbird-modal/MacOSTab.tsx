import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@components/Accordion";
import Button from "@components/Button";
import Code from "@components/Code";
import Separator from "@components/Separator";
import Steps from "@components/Steps";
import TabsContentPadding, { TabsContent } from "@components/Tabs";
import { GRPC_API_ORIGIN, pkgsDownloadUrl } from "@utils/netbird";
import {
  BeerIcon,
  DownloadIcon,
  ExternalLinkIcon,
  PackageOpenIcon,
  TerminalSquareIcon,
} from "lucide-react";
import Link from "next/link";
import React from "react";
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
export default function MacOSTab({
  setupKey,
  setupKeyContent,
  setupKeyPlaceholder,
  showSetupKeyInfo,
  hostname,
}: Readonly<Props>) {
  const t = useTranslations();
  // Mirrors WindowsTab: server flow (setupKeyContent present) forces
  // the CLI run branch so the netbird up command stays visible while
  // the operator generates a key.
  const useCliRun = !!setupKey || !!setupKeyContent;
  const baseMgmtStep = 2;
  const keyStep = GRPC_API_ORIGIN ? 3 : 2;
  const runStep = keyStep + (setupKeyContent ? 1 : 0);
  const usingSetupKeyParam = !!setupKey || !!setupKeyPlaceholder;
  return (
    <TabsContent value={String(OperatingSystem.APPLE)}>
      <TabsContentPadding>
        <p className={"font-medium flex gap-3 items-center text-base"}>
          <PackageOpenIcon size={16} />
          {t("setupNetbirdModal.installOnMacos")}
        </p>
        <Steps>
          <Steps.Step step={1}>
            <div className={"flex items-center gap-1 text-sm font-light"}>
              {t("setupNetbirdModal.downloadMacInstaller")}
            </div>
            <div className={"flex gap-4 mt-1 flex-wrap"}>
              <Link
                href={pkgsDownloadUrl("macos/universal")}
                passHref
                target={"_blank"}
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
              <ManagementUrlStep trayName={"menu bar"} />
            </Steps.Step>
          )}

          {setupKeyContent && (
            <Steps.Step step={keyStep}>{setupKeyContent}</Steps.Step>
          )}

          {useCliRun ? (
            <Steps.Step step={runStep} line={false}>
              <p>
                {t("setupNetbirdModal.openTerminalAndRun")}{" "}
                {showSetupKeyInfo && <RoutingPeerSetupKeyInfo />}
              </p>

              <NetBirdUpCommand
                setupKey={setupKey}
                setupKeyPlaceholder={setupKeyPlaceholder}
                hostname={hostname}
              />
            </Steps.Step>
          ) : (
            <>
              <Steps.Step step={runStep}>
                <p>
                  {/* eslint-disable-next-line react/no-unescaped-entities */}
                  {t("setupNetbirdModal.clickConnectMenuBar")}
                </p>
              </Steps.Step>
              <Steps.Step step={runStep + 1} line={false}>
                <p>{t("setupNetbirdModal.signUpWithEmail")}</p>
              </Steps.Step>
            </>
          )}
        </Steps>
      </TabsContentPadding>
      <Separator />
      <TabsContentPadding>
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>
              <TerminalSquareIcon size={16} />
              {t("setupNetbirdModal.installWithTerminal")}
            </AccordionTrigger>
            <AccordionContent>
              <Steps>
                <Steps.Step step={1}>
                  <Code>
                    curl -fsSL https://pkgs.netbird.io/install.sh | sh
                  </Code>
                </Steps.Step>
                <Steps.Step step={2} line={false}>
                  <p>
                    {t("setupNetbirdModal.runNetBird") + " "}{!usingSetupKeyParam && "and log in the browser"}
                    {showSetupKeyInfo && <RoutingPeerSetupKeyInfo />}
                  </p>
                  <NetBirdUpCommand
                    setupKey={setupKey}
                    setupKeyPlaceholder={setupKeyPlaceholder}
                    hostname={hostname}
                  />
                </Steps.Step>
              </Steps>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </TabsContentPadding>
      <Separator />
      <TabsContentPadding>
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>
              <BeerIcon size={16} />{" " + t("setupNetbirdModal.installWithHomebrew")}
            </AccordionTrigger>
            <AccordionContent>
              <Steps>
                <Steps.Step step={1}>
                  <p>{t("setupNetbirdModal.downloadHomebrew")}</p>
                  <div className={"flex gap-4"}>
                    <Link href={"https://brew.sh/"} passHref target={"_blank"}>
                      <Button variant={"primary"}>
                        <ExternalLinkIcon size={14} />
                        {t("setupNetbirdModal.homebrewGuide")}
                      </Button>
                    </Link>
                  </div>
                </Steps.Step>
                <Steps.Step step={2}>
                  <p>{t("setupNetbirdModal.installNetBird") + " "}</p>
                  <Code
                    codeToCopy={[
                      `brew install netbirdio/tap/netbird`,
                      `brew install --cask netbirdio/tap/netbird-ui`,
                    ].join("\n")}
                  >
                    <Code.Comment># for CLI only</Code.Comment>
                    <Code.Line>brew install netbirdio/tap/netbird</Code.Line>
                    <Code.Comment># for GUI package</Code.Comment>
                    <Code.Line>
                      brew install --cask netbirdio/tap/netbird-ui
                    </Code.Line>
                  </Code>
                </Steps.Step>
                <Steps.Step step={3}>
                  <p>{t("setupNetbirdModal.startDaemon")}</p>
                  <Code>
                    <Code.Line>sudo netbird service install</Code.Line>
                    <Code.Line>sudo netbird service start</Code.Line>
                  </Code>
                </Steps.Step>
                <Steps.Step step={4} line={false}>
                  <p>
                    {t("setupNetbirdModal.runNetBird") + " "}{!usingSetupKeyParam && "and log in the browser"}
                    {showSetupKeyInfo && <RoutingPeerSetupKeyInfo />}
                  </p>
                  <NetBirdUpCommand
                    setupKey={setupKey}
                    setupKeyPlaceholder={setupKeyPlaceholder}
                    hostname={hostname}
                  />
                </Steps.Step>
              </Steps>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </TabsContentPadding>
    </TabsContent>
  );
}
