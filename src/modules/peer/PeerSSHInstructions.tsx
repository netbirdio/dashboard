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
import { Mark } from "@components/ui/Mark";
import { cn } from "@utils/helpers";
import { ExternalLinkIcon, PlusCircle, TerminalSquare } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { SegmentedTabs } from "@components/SegmentedTabs";
import AndroidIcon from "@/assets/icons/AndroidIcon";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { isNetbirdSSHProtocolSupported } from "@utils/version";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
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
  const [client, setClient] = useState("cli");
  // Peers already on v0.61.0+ don't need to be told which release started
  // requiring a policy.
  const peerRequiresSSHPolicy = isNetbirdSSHProtocolSupported(
    peer?.version ?? "",
  );
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
          title={"Enable SSH Access"}
          description={
            "Allow remote SSH access from other connected network participants."
          }
          color={"netbird"}
        />

        <Separator />

        <div className={"px-8 py-3 flex flex-col gap-0 z-0 mt-1"}>
          <SegmentedTabs value={client} onChange={setClient}>
            <SegmentedTabs.List className={"rounded-lg border"}>
              <SegmentedTabs.Trigger value={"cli"}>
                <TerminalSquare size={16} />
                CLI
              </SegmentedTabs.Trigger>
              <SegmentedTabs.Trigger value={"gui"}>
                <NetBirdIcon size={16} />
                Desktop Client
              </SegmentedTabs.Trigger>
              <SegmentedTabs.Trigger value={"android"}>
                <AndroidIcon size={16} className={"fill-nb-gray-400"} />
                Android
              </SegmentedTabs.Trigger>
            </SegmentedTabs.List>
          </SegmentedTabs>

          <Steps>
            <Steps.Step step={1}>
              {client === "cli" && (
                <>
                  <p className={"font-normal"}>
                    If you are using NetBird via CLI, you can enable SSH by
                    running{" "}
                    {isWindows
                      ? "these commands in an elevated prompt"
                      : "these commands as root"}
                    . Run the first one only if NetBird is already running. On a
                    machine where you do not have those rights, an administrator
                    has to run them.
                  </p>
                  <Code codeToCopy={`${prefix}netbird down`}>
                    <Code.Line>{`${prefix}netbird down`}</Code.Line>
                  </Code>
                  <Code>
                    <Code.Line>{`${prefix}netbird up --allow-server-ssh --enable-ssh-root`}</Code.Line>
                  </Code>
                </>
              )}

              {client === "gui" && (
                <p className={"font-normal"}>
                  If you are using NetBird via the Desktop Client, click on the
                  NetBird tray icon, open <Mark>Settings</Mark> and turn on{" "}
                  <Mark>Enable SSH Server</Mark> on the <Mark>SSH</Mark> tab. To
                  log in as {isWindows ? "an administrator" : "root"}, enable{" "}
                  <Mark>Allow Root Login</Mark> on the same tab.
                </p>
              )}

              {client === "android" && (
                <p className={"font-normal"}>
                  If you are using NetBird on Android, open the app, tap{" "}
                  <Mark>Settings</Mark>, then <Mark>Advanced</Mark> and turn on{" "}
                  <Mark>Enable SSH Server</Mark>.
                </p>
              )}
            </Steps.Step>

            <Steps.Step step={2}>
              <p className={"font-normal"}>
                {peerRequiresSSHPolicy
                  ? "SSH requires an explicit access control policy to allow SSH connections to this machine."
                  : "Starting from NetBird v0.61.0, SSH requires an explicit access control policy to allow SSH connections to this machine."}
              </p>
              <div className={"mt-2"}>
                <Button
                  variant={"secondary"}
                  onClick={() => setPolicyModal(true)}
                >
                  <PlusCircle size={16} />
                  Create SSH Policy
                </Button>
              </div>
            </Steps.Step>
            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                Once the NetBird SSH server is enabled on the client, <br />
                click <Mark>Finish Setup</Mark> below to complete the setup.
              </p>
            </Steps.Step>
          </Steps>
        </div>

        <ModalFooter className={"items-center"}>
          <div className={"w-full"}>
            <Paragraph className={"text-sm mt-auto"}>
              Learn more about
              <InlineLink
                href={"https://docs.netbird.io/how-to/ssh"}
                target={"_blank"}
              >
                SSH
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </Paragraph>
          </div>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"}>Cancel</Button>
            </ModalClose>

            <Button variant={"primary"} onClick={onSuccess}>
              Finish Setup
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
