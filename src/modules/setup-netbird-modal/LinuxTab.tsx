"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@components/Accordion";
import Code from "@components/Code";
import Separator from "@components/Separator";
import Steps from "@components/Steps";
import TabsContentPadding, { TabsContent } from "@components/Tabs";
import { IconBrandUbuntu } from "@tabler/icons-react";
import { TerminalSquareIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
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

export default function LinuxTab({
  setupKey,
  setupKeyContent,
  setupKeyPlaceholder,
  showSetupKeyInfo = false,
  hostname,
}: Readonly<Props>) {
  const runStep = setupKeyContent ? 3 : 2;
  const usingSetupKey = !!setupKey || !!setupKeyPlaceholder;
  const t = useTranslations("setupModal");
  return (
    <TabsContent value={String(OperatingSystem.LINUX)}>
      <TabsContentPadding>
        <p className={"font-medium flex gap-3 items-center text-base"}>
          <TerminalSquareIcon size={16} />
          {t("installWithCli")}
        </p>
        <Steps>
          <Steps.Step step={1}>
            <Code>curl -fsSL https://pkgs.netbird.io/install.sh | sh</Code>
          </Steps.Step>
          {setupKeyContent && (
            <Steps.Step step={2}>{setupKeyContent}</Steps.Step>
          )}
          <Steps.Step step={runStep} line={false}>
            <p>
              {t("runNetBird")} {!usingSetupKey && t("andLogInBrowser")}
              {showSetupKeyInfo && <RoutingPeerSetupKeyInfo />}
            </p>
            <NetBirdUpCommand
              setupKey={setupKey}
              setupKeyPlaceholder={setupKeyPlaceholder}
              hostname={hostname}
            />
          </Steps.Step>
        </Steps>
      </TabsContentPadding>
      <Separator />
      <TabsContentPadding>
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>
              <IconBrandUbuntu size={16} />
              {t("installManuallyOnUbuntu")}
            </AccordionTrigger>
            <AccordionContent>
              <Steps>
                <Steps.Step step={1}>
                  <p>{t("addRepository")}</p>
                  <Code>
                    <Code.Line>sudo apt-get update</Code.Line>
                    <Code.Line>
                      sudo apt install ca-certificates curl gnupg -y
                    </Code.Line>
                    <Code.Line>
                      curl -sSL https://pkgs.netbird.io/debian/public.key | sudo
                      gpg --dearmor --output
                      /usr/share/keyrings/netbird-archive-keyring.gpg
                    </Code.Line>
                    <Code.Line>
                      {`echo 'deb [signed-by=/usr/share/keyrings/netbird-archive-keyring.gpg] https://pkgs.netbird.io/debian stable main' | sudo tee /etc/apt/sources.list.d/netbird.list`}
                    </Code.Line>
                  </Code>
                </Steps.Step>
                <Steps.Step step={2}>
                  <p>{t("installNetBird")}</p>
                  <Code
                    codeToCopy={[
                      `sudo apt-get update`,
                      `sudo apt-get install netbird`,
                      `sudo apt-get install netbird-ui`,
                    ].join("\n")}
                  >
                    <Code.Line>sudo apt-get update</Code.Line>
                    <Code.Comment># for CLI only</Code.Comment>
                    <Code.Line>sudo apt-get install netbird</Code.Line>
                    <Code.Comment># for GUI package</Code.Comment>
                    <Code.Line>sudo apt-get install netbird-ui</Code.Line>
                  </Code>
                </Steps.Step>
                <Steps.Step step={3} line={false}>
                  <p>
                    {t("runNetBird")} {!usingSetupKey && t("andLogInBrowser")}
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
