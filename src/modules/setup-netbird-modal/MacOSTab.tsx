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
import { getNetBirdUpCommand, GRPC_API_ORIGIN } from "@utils/netbird";
import {
  BeerIcon,
  DownloadIcon,
  ExternalLinkIcon,
  PackageOpenIcon,
  TerminalSquareIcon,
} from "lucide-react";
import Link from "next/link";
import React from "react";
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

export default function MacOSTab({
  setupKey,
  showSetupKeyInfo,
  hostname,
}: Readonly<Props>) {
  const { t } = useI18n();

  return (
    <TabsContent value={String(OperatingSystem.APPLE)}>
      <TabsContentPadding>
        <p className={"font-medium flex gap-3 items-center text-base"}>
          <PackageOpenIcon size={16} />
          {t("setupModal.macosInstallTitle")}
        </p>
        <Steps>
          <Steps.Step step={1}>
            <div className={"flex items-center gap-1 text-sm font-light"}>
              {t("setupModal.macosStep1")}
            </div>
            <div className={"flex gap-4 mt-1 flex-wrap"}>
              <Link
                href={"https://pkgs.netbird.io/macos/universal"}
                passHref
                target={"_blank"}
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
                {t("setupModal.openTerminalRunNetBird")}{" "}
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
      <Separator />
      <TabsContentPadding>
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>
              <TerminalSquareIcon size={16} />
              {t("setupModal.installManuallyTerminal")}
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
                    {t("setupModal.runNetBird")}
                    {!setupKey && ` ${t("setupModal.andLogInBrowser")}`}
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
              <BeerIcon size={16} /> {t("setupModal.installManuallyHomebrew")}
            </AccordionTrigger>
            <AccordionContent>
              <Steps>
                <Steps.Step step={1}>
                  <p>{t("setupModal.downloadInstallHomebrew")}</p>
                  <div className={"flex gap-4"}>
                    <Link href={"https://brew.sh/"} passHref target={"_blank"}>
                      <Button variant={"primary"}>
                        <ExternalLinkIcon size={14} />
                        {t("setupModal.homebrewGuide")}
                      </Button>
                    </Link>
                  </div>
                </Steps.Step>
                <Steps.Step step={2}>
                  <p>{t("setupModal.installNetBird")}</p>
                  <Code
                    codeToCopy={[
                      `brew install netbirdio/tap/netbird`,
                      `brew install --cask netbirdio/tap/netbird-ui`,
                    ].join("\n")}
                  >
                    <Code.Comment>{t("setupModal.cliOnlyComment")}</Code.Comment>
                    <Code.Line>brew install netbirdio/tap/netbird</Code.Line>
                    <Code.Comment>
                      {t("setupModal.guiPackageComment")}
                    </Code.Comment>
                    <Code.Line>
                      brew install --cask netbirdio/tap/netbird-ui
                    </Code.Line>
                  </Code>
                </Steps.Step>
                <Steps.Step step={3}>
                  <p>{t("setupModal.startNetBirdDaemon")}</p>
                  <Code>
                    <Code.Line>sudo netbird service install</Code.Line>
                    <Code.Line>sudo netbird service start</Code.Line>
                  </Code>
                </Steps.Step>
                <Steps.Step step={4} line={false}>
                  <p>
                    {t("setupModal.runNetBird")}
                    {!setupKey && ` ${t("setupModal.andLogInBrowser")}`}
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
              </Steps>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </TabsContentPadding>
    </TabsContent>
  );
}
