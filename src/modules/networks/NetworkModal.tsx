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
import { useI18n } from "@/i18n/I18nProvider";
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
        onCreated={(nextNetwork) => {
          setOpen?.(false);
          onCreated?.(nextNetwork);
        }}
        onUpdated={(nextNetwork) => {
          setOpen?.(false);
          onUpdated?.(nextNetwork);
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
  const { t } = useI18n();

  const updateNetwork = async () => {
    notify({
      title: name,
      description: t("network.updated"),
      loadingMessage: t("network.updating"),
      promise: update({ name, description }, `/${network?.id}`).then((next) => {
        onUpdated?.(next);
      }),
    });
  };

  const createNetwork = async () => {
    notify({
      title: name,
      description: t("network.created"),
      loadingMessage: t("network.creating"),
      promise: create({ name, description }).then((next) => {
        onCreated?.(next);
      }),
    });
  };

  return (
    <ModalContent maxWidthClass={"max-w-xl"}>
      <ModalHeader
        icon={<NetworkRoutesIcon className={"fill-netbird"} />}
        title={network ? t("network.modalUpdateTitle") : t("network.modalAddTitle")}
        description={network ? network.name : t("network.modalAddDescription")}
        color={"netbird"}
      />
      <Separator />
      <div className={"px-8 flex-col flex gap-6 py-6"}>
        <div>
          <Label>{t("network.name")}</Label>
          <HelpText>{t("network.nameHelp")}</HelpText>
          <Input
            tabIndex={0}
            placeholder={t("network.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label>{t("network.descriptionLabel")}</Label>
          <HelpText>{t("network.descriptionHelp")}</HelpText>
          <Textarea
            placeholder={t("network.descriptionPlaceholder")}
            value={description}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            {t("common.learnMorePrefix")}{" "}
            <InlineLink
              href={"https://docs.netbird.io/how-to/networks"}
              target={"_blank"}
            >
              {t("networks.title")}
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>{t("actions.cancel")}</Button>
          </ModalClose>

          <Button
            variant={"primary"}
            data-cy={"submit-route"}
            disabled={!name}
            onClick={network ? updateNetwork : createNetwork}
          >
            {network ? (
              t("actions.saveChanges")
            ) : (
              <>
                <PlusCircle size={16} />
                {t("networks.addNetwork")}
              </>
            )}
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
};
