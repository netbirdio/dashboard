"use client";

import Button from "@components/Button";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import Separator from "@components/Separator";
import { Textarea } from "@components/Textarea";
import { useApiCall } from "@utils/api";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import React, { useState } from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { Network } from "@/interfaces/Network";

type Props = {
  open: boolean;
  setOpen?: (open: boolean) => void;
  network?: Network;
  onCreated?: (network: Network) => void;
  onUpdated?: (network: Network) => void;
};

export default function NetworkModal({
  open,
  setOpen,
  network,
  onCreated,
  onUpdated,
}: Readonly<Props>) {
  return (
    <Modal open={open} onOpenChange={setOpen}>
      <Content
        network={network}
        onCreated={(network) => {
          setOpen?.(false);
          onCreated?.(network);
        }}
        onUpdated={(network) => {
          setOpen?.(false);
          onUpdated?.(network);
        }}
        key={open ? "1" : "0"}
      />
    </Modal>
  );
}

type ContentProps = {
  onCreated?: (network: Network) => void;
  onUpdated?: (network: Network) => void;
  network?: Network;
};

const Content = ({ network, onCreated, onUpdated }: ContentProps) => {
  const [name, setName] = useState(network?.name || "");
  const [description, setDescription] = useState(network?.description || "");
  const create = useApiCall<Network>("/networks").post;
  const update = useApiCall<Network>("/networks").put;

  const updateNetwork = async () => {
    notify({
      title: name,
      description: "Network updated successfully.",
      loadingMessage: "Updating network...",
      promise: update({ name, description }, `/${network?.id}`).then((n) => {
        onUpdated?.(n);
      }),
    });
  };

  const createNetwork = async () => {
    notify({
      title: name,
      description: "Network created successfully.",
      loadingMessage: "Creating network...",
      promise: create({ name, description }).then((n) => {
        onCreated?.(n);
      }),
    });
  };

  return (
    <ModalContent maxWidthClass={"max-w-xl"}>
      <ModalHeader
        icon={<NetworkRoutesIcon className={"fill-netbird"} />}
        title={network ? "Update Network" : "Add Network"}
        description={
          network
            ? network.name
            : "Access resources like LANs and VPC by adding a network."
        }
        color={"netbird"}
      />
      <Separator />
      <div className={"px-8 flex-col flex gap-6 py-6"}>
        <div>
          <Label>Network Name</Label>
          <HelpText>Provide a unique name for the network.</HelpText>
          <Input
            tabIndex={0}
            placeholder={"e.g., Office Network"}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label>Description (optional)</Label>
          <HelpText>
            Write a short description to add more context to this network.
          </HelpText>
          <Textarea
            placeholder={"e.g., Berlin, Münzstraße 12 "}
            value={description}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            Learn more about
            <InlineLink href={"#"} target={"_blank"}>
              Networks
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
            data-cy={"submit-route"}
            disabled={!name}
            onClick={network ? updateNetwork : createNetwork}
          >
            {network ? (
              "Save Changes"
            ) : (
              <>
                <PlusCircle size={16} />
                Add Network
              </>
            )}
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
};
