import Button from "@components/Button";
import { Callout } from "@components/Callout";
import { Input } from "@components/Input";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import cidr from "ip-cidr";
import { trim } from "lodash";
import React, { useMemo, useState } from "react";

type IPVersion = "v4" | "v6";

interface PeerEditIPModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (ip: string) => void;
  currentIP: string;
  version: IPVersion;
}

const config: Record<
  IPVersion,
  {
    title: string;
    description: string;
    placeholder: string;
    errorMessage: string;
    validate: (ip: string) => boolean;
  }
> = {
  v4: {
    title: "Edit Peer IP Address",
    description: "Update the NetBird IP address for this peer.",
    placeholder: "e.g., 100.64.0.15",
    errorMessage: "Please enter a valid IP, e.g., 100.64.0.15",
    validate: (ip: string) =>
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
        ip,
      ),
  },
  v6: {
    title: "Edit Peer IPv6 Address",
    description: "Update the NetBird IPv6 address for this peer.",
    placeholder: "e.g., fd00:1234::1",
    errorMessage: "Please enter a valid IPv6 address, e.g., fd00:1234::1",
    validate: (ip: string) => cidr.isValidAddress(ip) && ip.includes(":"),
  },
};

export function PeerEditIPModal({
  open,
  onOpenChange,
  onSave,
  currentIP,
  version,
}: Readonly<PeerEditIPModalProps>) {
  const { title, description, placeholder, errorMessage, validate } =
    config[version];
  const [ip, setIP] = useState(currentIP);

  const isDisabled = useMemo(() => {
    if (ip === currentIP) return true;
    const trimmed = trim(ip);
    return trimmed.length === 0 || !validate(trimmed);
  }, [ip, currentIP, validate]);

  const error = useMemo(() => {
    if (ip === currentIP) return "";
    if (!validate(trim(ip))) return errorMessage;
    return "";
  }, [ip, currentIP, validate, errorMessage]);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass={"max-w-md"}>
        <form>
          <ModalHeader title={title} description={description} color={"blue"} />

          <div className={"p-default flex flex-col gap-4"}>
            <div>
              <Input
                placeholder={placeholder}
                value={ip}
                onChange={(e) => setIP(e.target.value)}
                error={error}
              />
            </div>

            <Callout>Changes take effect when the peer reconnects.</Callout>
          </div>

          <ModalFooter className={"items-center"} separator={false}>
            <div className={"flex gap-3 w-full justify-end"}>
              <ModalClose asChild={true}>
                <Button variant={"secondary"} className={"w-full"}>
                  Cancel
                </Button>
              </ModalClose>

              <Button
                variant={"primary"}
                className={"w-full"}
                onClick={() => onSave(trim(ip))}
                disabled={isDisabled}
              >
                Save
              </Button>
            </div>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
