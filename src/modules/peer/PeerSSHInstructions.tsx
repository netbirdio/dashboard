import Button from "@components/Button";
import Code from "@components/Code";
import InlineLink from "@components/InlineLink";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import Paragraph from "@components/Paragraph";
import Separator from "@components/Separator";
import Steps from "@components/Steps";
import { Lightbox } from "@components/ui/Lightbox";
import { Mark } from "@components/ui/Mark";
import { cn } from "@utils/helpers";
import { ExternalLinkIcon, PlusCircle, TerminalSquare } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import sshImage from "@/assets/ssh/ssh-client.png";
import { SegmentedTabs } from "@components/SegmentedTabs";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { useTranslations } from "@/i18n/LocaleProvider";
import { Peer } from "@/interfaces/Peer";
import { PeerSSHPolicyModal } from "@/modules/peer/PeerSSHPolicyModal";
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { OperatingSystem } from "@/interfaces/OperatingSystem";

type Props = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  peer?: Peer;
};

export const PeerSSHInstructions = ({
  open,
  onOpenChange,
  onSuccess,
  peer,
}: Props) => {
  const t = useTranslations();
  const [client, setClient] = useState("cli");
  const [policyModal, setPolicyModal] = useState(false);

  // Enabling the SSH server and root login require root, or an administrator on
  // Windows, since they decide who may obtain a shell on that machine.
  const isWindows =
    !!peer?.os && getOperatingSystem(peer.os) === OperatingSystem.WINDOWS;
  const prefix = isWindows ? "" : "sudo ";

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        maxWidthClass={cn("relative", "max-w-2xl")}
        showClose={true}
      >
        <ModalHeader
          icon={<TerminalSquare size={16} className={"text-netbird"} />}
          title={t("peer.enableSSH")}
          description={t("peer.allowRemoteSshDescription")}
          color={"netbird"}
        />

        <Separator />

        <div className={"px-8 py-3 flex flex-col gap-0 z-0 mt-1"}>
          <SegmentedTabs value={client} onChange={setClient}>
            <SegmentedTabs.List className={"rounded-lg border"}>
              <SegmentedTabs.Trigger value={"cli"}>
                <TerminalSquare size={16} />
                {t("peer.cli")}
              </SegmentedTabs.Trigger>
              <SegmentedTabs.Trigger value={"gui"}>
                <NetBirdIcon size={16} />
                {t("peer.desktopClient")}
              </SegmentedTabs.Trigger>
            </SegmentedTabs.List>
          </SegmentedTabs>

          <Steps>
            {client === "cli" ? (
              <Steps.Step step={1}>
                <p className={"font-normal"}>
                  {t("peer.cliSshInstructions", {
                    privilege: isWindows
                      ? t("peer.elevatedPrompt")
                      : t("peer.commandsAsRoot"),
                  })}
                </p>
                <Code codeToCopy={`${prefix}netbird down`}>
                  <Code.Line>{`${prefix}netbird down`}</Code.Line>
                </Code>
                <Code>
                  <Code.Line>{`${prefix}netbird up --allow-server-ssh --enable-ssh-root`}</Code.Line>
                </Code>
              </Steps.Step>
            ) : (
              <Steps.Step step={1}>
                <p className={"font-normal"}>
                  {t.rich("peer.desktopSshInstructions", {
                    settings: () => <Mark>{t("common.settings")}</Mark>,
                    allow: () => <Mark>{t("peer.allowSSH")}</Mark>,
                    advanced: () => (
                      <Mark>{t("peer.advancedSettingsPath")}</Mark>
                    ),
                  })}
                </p>
                <Lightbox image={sshImage} />
              </Steps.Step>
            )}

            <Steps.Step step={2}>
              <p className={"font-normal"}>{t("peer.sshRequiresPolicy")}</p>
              <div className={"mt-2"}>
                <Button
                  variant={"secondary"}
                  onClick={() => setPolicyModal(true)}
                >
                  <PlusCircle size={16} />
                  {t("peer.createSSHPolicy")}
                </Button>
              </div>
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                {t("peer.sshServerAllowedPrefix")} <br />
                {t.rich("peer.confirmAndEnableBelow", {
                  action: () => <Mark>{t("peer.confirmAndEnable")}</Mark>,
                })}
              </p>
            </Steps.Step>
          </Steps>
        </div>

        <ModalFooter className={"items-center"}>
          <div className={"w-full"}>
            <Paragraph className={"text-sm mt-auto"}>
              {t.rich("peer.learnMoreAboutSsh", {
                link: (chunks) => (
                  <InlineLink
                    href={"https://docs.netbird.io/how-to/ssh"}
                    target={"_blank"}
                  >
                    {chunks}
                    <ExternalLinkIcon size={12} />
                  </InlineLink>
                ),
              })}
            </Paragraph>
          </div>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"}>{t("common.cancel")}</Button>
            </ModalClose>

            <Button variant={"primary"} onClick={onSuccess}>
              {t("common.finishSetup")}
            </Button>
          </div>
        </ModalFooter>

        <PeerSSHPolicyModal
          open={policyModal}
          onOpenChange={setPolicyModal}
          peer={peer}
        />
      </ModalContent>
    </Modal>
  );
};
