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
import { ExternalLinkIcon, TerminalSquare } from "lucide-react";
import * as React from "react";
import sshImage from "@/assets/ssh/ssh-client.png";

type Props = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
};

export const PeerSSHInstructions = ({
  open,
  onOpenChange,
  onSuccess,
}: Props) => {
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
            "Allow remote SSH access to this machine from other connected network participants."
          }
          color={"netbird"}
        />

        <Separator />

        <div className={"px-8 py-3 flex flex-col gap-0 z-0"}>
          <Steps>
            <Steps.Step step={1}>
              <p className={"font-normal"}>
                If you are using NetBird via CLI, you can enable SSH by running
              </p>
              <Code codeToCopy={"netbird down"}>
                <Code.Line>{`netbird down # if NetBird is already running`}</Code.Line>
              </Code>
              <Code>
                <Code.Line>{`netbird up --allow-server-ssh --enable-ssh-root`}</Code.Line>
              </Code>
            </Steps.Step>

            <Steps.Step step={2}>
              <p className={"font-normal"}>
                If you are using NetBird via the Desktop Client, click on the
                NetBird tray icon, go to <Mark>Settings</Mark> and click{" "}
                <Mark>Allow SSH</Mark> <br />
              </p>
              <Lightbox image={sshImage} />
            </Steps.Step>

            <Steps.Step step={3} line={false}>
              <p className={"font-normal"}>
                Once the NetBird SSH server is allowed on the client, <br />
                click <Mark>Confirm & Enable</Mark> below to finish the setup.
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

            <Button
              variant={"primary"}
              onClick={onSuccess}
              data-cy={"create-setup-key"}
            >
              Confirm & Enable
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
