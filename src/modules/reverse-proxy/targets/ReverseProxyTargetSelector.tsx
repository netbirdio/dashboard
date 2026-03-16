"use client";

import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import { Modal } from "@components/modal/Modal";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import React, { useState } from "react";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { ReverseProxyTargetType } from "@/interfaces/ReverseProxy";
import { isResourceTargetType } from "@/contexts/ReverseProxiesProvider";
import { HelpTooltip } from "@components/HelpTooltip";
import InlineLink, { InlineButtonLink } from "@components/InlineLink";
import SetupModal from "@/modules/setup-netbird-modal/SetupModal";
import useFetchApi from "@utils/api";

export type Target = {
  type: ReverseProxyTargetType;
  peerId?: string;
  resourceId?: string;
  host: string;
  resourceAddress?: string;
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
  const { data: resources } = useFetchApi<NetworkResource[]>(
    "/networks/resources",
  );
  const { data: peers } = useFetchApi<Peer[]>("/peers");
  const [installModal, setInstallModal] = useState(false);

  return (
    <div>
      <Label className={"gap-0 inline"}>
        {initialNetwork ? (
          "Select Resource"
        ) : (
          <>
            Select{" "}
            <HelpTooltip
              className={"max-w-sm"}
              content={
                <>
                  A <span className={"text-white font-medium"}>peer</span> is a
                  machine (e.g., laptop, server, container) running NetBird.
                  Select a peer if your service runs directly on it.
                  <span className={"mt-1 block"}>
                    If you don&apos;t have a peer yet, you can{" "}
                    <InlineButtonLink onClick={() => setInstallModal(true)}>
                      Install NetBird
                    </InlineButtonLink>
                    .
                  </span>
                </>
              }
              interactive={true}
            >
              Peer
            </HelpTooltip>{" "}
            or{" "}
            <HelpTooltip
              className={"max-w-sm"}
              content={
                <>
                  A <span className={"text-white font-medium"}>resource</span>{" "}
                  is a destination (IP, subnet, or domain) that can&apos;t run
                  NetBird directly. Resources are part of a network and are
                  reached through a routing peer that forwards traffic to them.
                  <span className={"mt-1 block"}>
                    If you don&apos;t have resources yet, go to{" "}
                    <InlineLink href={"/networks"}>Networks</InlineLink> to
                    create some.
                  </span>
                </>
              }
              interactive={true}
            >
              Resource
            </HelpTooltip>
          </>
        )}
      </Label>
      <HelpText>
        {initialNetwork
          ? "Select the resource from your network you want to expose."
          : "Select the peer where your service is running or select a resource to expose it."}
      </HelpText>
      <PeerGroupSelector
        values={[]}
        onChange={() => {}}
        placeholder={
          initialNetwork
            ? "Select a resource..."
            : "Select a peer or resource..."
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
            ? { id: value.resourceId, type: "host" }
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
                resourceAddress: address,
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
