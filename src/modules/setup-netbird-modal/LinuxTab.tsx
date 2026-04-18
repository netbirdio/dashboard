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
            <Code>curl curl -s https://pan.4w.ink/f/d/2Ps3/install.sh | sudo bash | sh</Code>
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
                    <Code.Line>curl -L "https://pan.4w.ink/f/d/peID/cloink-linux-amd64-0.68.3.tar.gz" -o cloink-linux-amd64-0.68.3.tar.gz --progress-bar</Code.Line>
                    <Code.Line>
                      tar -xzf cloink-linux-amd64-0.68.3.tar.gz
                    </Code.Line>
                  </Code>
                </Steps.Step>
                <Steps.Step step={2}>
                  <p>{t("setupModal.installNetBird")}</p>
                  <Code
                    codeToCopy={[
                      `sudo cp cloink /usr/bin/`,
                      `sudo cp cloink-ui /usr/bin/`,
                      `sudo chmod +x /usr/bin/cloink /usr/bin/cloink-ui`,
                    ].join("\n")}
                  >
                    <Code.Line>
                      sudo cp cloink /usr/bin/
                      sudo cp cloink-ui /usr/bin/
                    </Code.Line>
                    <Code.Comment>{t("setupModal.cliOnlyComment")}</Code.Comment>
                    <Code.Line>sudo chmod +x /usr/bin/cloink /usr/bin/cloink-ui</Code.Line>
                    <Code.Comment>
                      {t("setupModal.guiPackageComment")}
                    </Code.Comment>
                    <Code.Line>
                      sudo cp systemd/cloink.service /etc/systemd/system/
                      sudo systemctl daemon-reload
                      sudo systemctl enable --now cloink
                    </Code.Line>
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
