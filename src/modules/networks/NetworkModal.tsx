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
import { useTranslations } from "next-intl";
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
  const t = useTranslations("networks");
  const tCommon = useTranslations("common");
  const [name, setName] = useState(network?.name || "");
  const [description, setDescription] = useState(network?.description || "");
  const create = useApiCall<Network>("/networks").post;
  const update = useApiCall<Network>("/networks").put;

  const updateNetwork = async () => {
    notify({
      title: name,
      description: t("networkUpdated"),
      loadingMessage: t("networkUpdating"),
      promise: update({ name, description }, `/${network?.id}`).then((n) => {
        onUpdated?.(n);
      }),
    });
  };

  const createNetwork = async () => {
    notify({
      title: name,
      description: t("networkCreated"),
      loadingMessage: t("networkCreating"),
      promise: create({ name, description }).then((n) => {
        onCreated?.(n);
      }),
    });
  };

  return (
    <ModalContent maxWidthClass={"max-w-xl"}>
      <ModalHeader
        icon={<NetworkRoutesIcon className={"fill-netbird"} />}
        title={network ? t("updateNetwork") : t("addNetwork")}
        description={
          network
            ? network.name
            : t("modalAccessDescription")
        }
        color={"netbird"}
      />
      <Separator />
      <div className={"px-8 flex-col flex gap-6 py-6"}>
        <div>
          <Label>{t("networkNameLabel")}</Label>
          <HelpText>{t("networkNameHelp")}</HelpText>
          <Input
            tabIndex={0}
data-testid="network-name-input"
			placeholder={t("networkNameModalPlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label>{t("networkDescriptionLabel")}</Label>
          <HelpText>{t("networkDescriptionHelp")}</HelpText>
          <Textarea
data-testid="network-description-input"
			placeholder={t("networkDescriptionPlaceholder")}
            value={description}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            {t("learnMoreAbout")}
            <InlineLink
              href={"https://docs.netbird.io/how-to/networks"}
              target={"_blank"}
            >
              {t("title")}
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>{tCommon("cancel")}</Button>
          </ModalClose>

          <Button
            variant={"primary"}
            data-testid={"submit-network"}
            disabled={!name}
            onClick={network ? updateNetwork : createNetwork}
          >
            {network ? (
              t("saveChanges")
            ) : (
              <>
                <PlusCircle size={16} />
                {t("addNetwork")}
              </>
            )}
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
};
