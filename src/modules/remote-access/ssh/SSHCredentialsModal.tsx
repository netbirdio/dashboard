import * as React from "react";
import { useMemo, useState } from "react";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { Peer } from "@/interfaces/Peer";
import {
  ChevronsLeftRightEllipsis,
  ExternalLinkIcon,
  TerminalIcon,
  User2,
} from "lucide-react";
import Separator from "@components/Separator";
import Paragraph from "@components/Paragraph";
import InlineLink from "@components/InlineLink";
import Button from "@components/Button";
import { Label } from "@components/Label";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { isNativeSSHSupported } from "@utils/version";
import { SSH_DOCS_LINK } from "@/modules/remote-access/ssh/useSSH";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peer: Peer;
};

export const SSHCredentialsModal = ({ open, onOpenChange, peer }: Props) => {
  const [username, setUsername] = useState(
    getOperatingSystem(peer.os) === OperatingSystem.WINDOWS
      ? "Administrator"
      : "root",
  );

  const [port, setPort] = useState(
    isNativeSSHSupported(peer.version) ? "22" : "44338",
  );

  const userNameError = useMemo(() => {
    if (username?.length === 0) return "Username cannot be empty";
  }, [username]);

  const portError = useMemo(() => {
    const portNumber = Number(port);
    const isValid =
      Number.isInteger(portNumber) && portNumber > 0 && portNumber <= 65535;
    if (!isValid) return "Port must be a number between 1 and 65535";
  }, [port]);

  const hasAnyError = useMemo(() => {
    if (userNameError !== undefined) return true;
    return portError !== undefined;
  }, [userNameError, portError]);

  const openSSHWindow = () => {
    const encodedUsername = encodeURIComponent(username.trim());
    const encodedPort = encodeURIComponent(port.trim());

    window.open(
      `peer/ssh?id=${peer.id}&user=${encodedUsername}&port=${encodedPort}`,
      "_blank",
      "noopener,noreferrer,width=800,height=450,left=100,top=100,location=no,toolbar=no,menubar=no,status=no",
    );
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass={"max-w-lg"}>
        <ModalHeader
          icon={<TerminalIcon className={"text-netbird"} size={18} />}
          title={peer.name}
          description={`Connect to ${peer.ip} via SSH`}
          color={"netbird"}
        />
        <Separator />

        <div className={"px-8 py-6 flex flex-col gap-8"}>
          <div className={""}>
            <Label>Username & Port</Label>
            <HelpText>
              The username and port you will use to connect to the remote host.
            </HelpText>
            <div className={"flex flex-col gap-2 w-full"}>
              <Input
                placeholder={"root"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                customSuffix={`@${peer.ip}`}
                data-1p-ignore
                autoComplete={"off"}
                error={userNameError}
                errorTooltip={true}
                errorTooltipPosition={"top-right"}
                customPrefix={
                  <User2 size={16} className={"text-nb-gray-300"} />
                }
              />
              <Input
                maxWidthClass={""}
                placeholder={"22"}
                min={1}
                max={65535}
                value={port}
                type={"number"}
                error={portError}
                errorTooltip={true}
                errorTooltipPosition={"top-right"}
                onChange={(e) => setPort(e.target.value)}
                customPrefix={
                  <ChevronsLeftRightEllipsis
                    size={16}
                    className={"text-nb-gray-300"}
                  />
                }
              />
            </div>
          </div>
        </div>

        <ModalFooter className={"items-center"}>
          <div className={"w-full"}>
            <Paragraph className={"text-sm mt-auto"}>
              Learn more about
              <InlineLink href={SSH_DOCS_LINK} target={"_blank"}>
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
              disabled={hasAnyError}
              onClick={openSSHWindow}
            >
              Connect
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
