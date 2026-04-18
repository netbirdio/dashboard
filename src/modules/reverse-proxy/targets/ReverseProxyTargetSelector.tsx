"use client";

import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import { Modal } from "@components/modal/Modal";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import React, { useState } from "react";
import { Network } from "@/interfaces/Network";
import { ReverseProxyTargetType } from "@/interfaces/ReverseProxy";
import {
  isResourceTargetType,
  useReverseProxies,
} from "@/contexts/ReverseProxiesProvider";
import { HelpTooltip } from "@components/HelpTooltip";
import InlineLink, { InlineButtonLink } from "@components/InlineLink";
import SetupModal from "@/modules/setup-netbird-modal/SetupModal";
import { useI18n } from "@/i18n/I18nProvider";

export type Target = {
  type: ReverseProxyTargetType;
  peerId?: string;
  resourceId?: string;
  host: string;
};

type Props = {
  value?: Target;
  initialNetwork?: Network;
  onChange: (value: Target | undefined) => void;
};

export default function ReverseProxyTargetSelector({
  value,
  initialNetwork,
  onChange,
}: Readonly<Props>) {
  const { resources, peers } = useReverseProxies();
  const [installModal, setInstallModal] = useState(false);
  const { t } = useI18n();

  return (
    <div>
      <Label className={"gap-0 inline"}>
        {initialNetwork ? (
          t("reverseProxy.targetSelectResource")
        ) : (
          <>
            {t("reverseProxy.targetSelectPeerOrResource")}{" "}
            <HelpTooltip
              className={"max-w-sm"}
              content={
                <>
                  {t("reverseProxy.targetPeerHelp")}
                  <span className={"mt-1 block"}>
                    {t("reverseProxy.targetPeerInstall")}{" "}
                    <InlineButtonLink onClick={() => setInstallModal(true)}>
                      {t("reverseProxy.installNetBird")}
                    </InlineButtonLink>
                    .
                  </span>
                </>
              }
              interactive={true}
            >
              {t("reverseProxy.targetPeerLabel")}
            </HelpTooltip>{" "}
            {t("reverseProxy.targetPeerOrResourceConnector")}{" "}
            <HelpTooltip
              className={"max-w-sm"}
              content={
                <>
                  {t("reverseProxy.targetResourceHelp")}
                  <span className={"mt-1 block"}>
                    {t("reverseProxy.targetResourceCreate")}{" "}
                    <InlineLink href={"/networks"}>
                      {t("reverseProxy.networks")}
                    </InlineLink>{" "}
                    {t("reverseProxy.targetCreateSome")}
                  </span>
                </>
              }
              interactive={true}
            >
              {t("reverseProxy.targetResourceLabel")}
            </HelpTooltip>
          </>
        )}
      </Label>
      <HelpText>
        {initialNetwork
          ? t("reverseProxy.targetSelectResourceHelp")
          : t("reverseProxy.targetSelectPeerOrResourceHelp")}
      </HelpText>
      <PeerGroupSelector
        values={[]}
        onChange={() => {}}
        placeholder={
          initialNetwork
            ? t("reverseProxy.targetSelectResourcePlaceholder")
            : t("reverseProxy.targetSelectPeerOrResourcePlaceholder")
        }
        showPeers={!initialNetwork}
        showResources={true}
        showRoutes={false}
        hideAllGroup={true}
        hideGroupsTab={true}
        resourceIds={
          initialNetwork ? initialNetwork.resources ?? [] : undefined
        }
        tabOrder={initialNetwork ? ["resources"] : ["peers", "resources"]}
        closeOnSelect={true}
        max={1}
        resource={
          value?.type && isResourceTargetType(value.type) && value.resourceId
            ? { id: value.resourceId, type: value.type }
            : value?.type === ReverseProxyTargetType.PEER && value.peerId
            ? { id: value.peerId, type: "peer" }
            : undefined
        }
        onResourceChange={(res) => {
          if (res) {
            if (res.type === "peer") {
              const peer = peers?.find((p) => p.id === res.id);
              onChange({
                type: ReverseProxyTargetType.PEER,
                peerId: res.id,
                host: peer?.ip || "localhost",
              });
            } else {
              const selectedResource = resources?.find((r) => r.id === res.id);
              const address = selectedResource?.address || "";
              onChange({
                type:
                  (selectedResource?.type as ReverseProxyTargetType) ??
                  ReverseProxyTargetType.HOST,
                resourceId: res.id,
                host: address.includes("/") ? address.split("/")[0] : address,
              });
            }
          } else {
            onChange(undefined);
          }
        }}
      />
      <Modal open={installModal} onOpenChange={setInstallModal}>
        <SetupModal />
      </Modal>
    </div>
  );
}
