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
import { getNetBirdUpCommand } from "@utils/netbird";
import { TerminalSquareIcon } from "lucide-react";
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

export default function LinuxTab({
  setupKey,
  showSetupKeyInfo = false,
  hostname,
}: Readonly<Props>) {
  const { t } = useI18n();

  return (
    <TabsContent value={String(OperatingSystem.LINUX)}>
      <TabsContentPadding>
        <p className={"font-medium flex gap-3 items-center text-base"}>
          <TerminalSquareIcon size={16} />
          {t("setupModal.installWithCommandLine")}
        </p>
        <Steps>
          <Steps.Step step={1}>
            <Code>curl -fsSL https://pkgs.netbird.io/install.sh | sh</Code>
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
      </TabsContentPadding>
      <Separator />
      <TabsContentPadding>
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>
              <IconBrandUbuntu size={16} />
              {t("setupModal.installManuallyUbuntu")}
            </AccordionTrigger>
            <AccordionContent>
              <Steps>
                <Steps.Step step={1}>
                  <p>{t("setupModal.addRepository")}</p>
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
                  <p>{t("setupModal.installNetBird")}</p>
                  <Code
                    codeToCopy={[
                      `sudo apt-get update`,
                      `sudo apt-get install netbird`,
                      `sudo apt-get install netbird-ui`,
                    ].join("\n")}
                  >
                    <Code.Line>sudo apt-get update</Code.Line>
                    <Code.Comment>{t("setupModal.cliOnlyComment")}</Code.Comment>
                    <Code.Line>sudo apt-get install netbird</Code.Line>
                    <Code.Comment>
                      {t("setupModal.guiPackageComment")}
                    </Code.Comment>
                    <Code.Line>sudo apt-get install netbird-ui</Code.Line>
                  </Code>
                </Steps.Step>
                <Steps.Step step={3} line={false}>
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
