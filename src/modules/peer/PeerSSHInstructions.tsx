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
import { useI18n } from "@/i18n/I18nProvider";
import { Peer } from "@/interfaces/Peer";
import { PeerSSHPolicyModal } from "@/modules/peer/PeerSSHPolicyModal";

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
  const { t } = useI18n();
  const [client, setClient] = useState("cli");
  const [policyModal, setPolicyModal] = useState(false);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        maxWidthClass={cn("relative", "max-w-2xl")}
        showClose={true}
      >
        <ModalHeader
          icon={<TerminalSquare size={16} className={"text-netbird"} />}
          title={t("peerSsh.enableAccess")}
          description={t("peerSsh.enableAccessDescription")}
          color={"netbird"}
        />

        <Separator />

        <div className={"px-8 py-3 flex flex-col gap-0 z-0 mt-1"}>
          <SegmentedTabs value={client} onChange={setClient}>
            <SegmentedTabs.List className={"rounded-lg border"}>
              <SegmentedTabs.Trigger value={"cli"}>
                <TerminalSquare size={16} />
                {t("peerSsh.cliClient")}
              </SegmentedTabs.Trigger>
              <SegmentedTabs.Trigger value={"gui"}>
                <NetBirdIcon size={16} />
                {t("peerSsh.desktopClient")}
              </SegmentedTabs.Trigger>
            </SegmentedTabs.List>
          </SegmentedTabs>

          <Steps>
            {client === "cli" ? (
              <Steps.Step step={1}>
                <p className={"font-normal"}>
                  {t("peerSsh.cliStepIntro")}
                </p>
                <Code codeToCopy={"netbird down"}>
                  <Code.Line>{`netbird down # if NetBird is already running`}</Code.Line>
                </Code>
                <Code>
                  <Code.Line>{`netbird up --allow-server-ssh --enable-ssh-root`}</Code.Line>
                </Code>
              </Steps.Step>
            ) : (
              <Steps.Step step={1}>
                <p className={"font-normal"}>
                  {t("peerSsh.desktopStepPrefix")} <Mark>{t("peerSsh.settings")}</Mark>{" "}
                  {t("peerSsh.desktopStepMiddle")} <Mark>{t("peerSsh.allowSsh")}</Mark>.{" "}
                  {t("peerSsh.desktopStepAdvancedPrefix")}{" "}
                  <Mark>{t("peerSsh.advancedSettings")}</Mark>{" "}
                  {t("peerSsh.desktopStepAdvancedSuffix")}
                </p>
                <Lightbox image={sshImage} />
              </Steps.Step>
            )}

            <Steps.Step step={2}>
              <p className={"font-normal"}>
                {t("peerSsh.explicitPolicyRequired")}
              </p>
              <div className={"mt-2"}>
                <Button
                  variant={"secondary"}
                  onClick={() => setPolicyModal(true)}
                >
                  <PlusCircle size={16} />
                  {t("peerSsh.createPolicy")}
                </Button>
              </div>
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                {t("peerSsh.finishStepPrefix")} <br />
                {t("peerSsh.finishStepMiddle")} <Mark>{t("peerSsh.confirmAndEnable")}</Mark>{" "}
                {t("peerSsh.finishStepSuffix")}
              </p>
            </Steps.Step>
          </Steps>
        </div>

        <ModalFooter className={"items-center"}>
          <div className={"w-full"}>
            <Paragraph className={"text-sm mt-auto"}>
              {t("common.learnMorePrefix")}{" "}
              <InlineLink
                href={"https://docs.netbird.io/how-to/ssh"}
                target={"_blank"}
              >
                {t("peerSsh.ssh")}
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </Paragraph>
          </div>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"}>{t("common.cancel")}</Button>
            </ModalClose>

            <Button variant={"primary"} onClick={onSuccess}>
              {t("peerSsh.finishSetup")}
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
