"use client";

import Button from "@components/Button";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Label } from "@components/Label";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { NetworkRouteSelector } from "@components/NetworkRouteSelector";
import Paragraph from "@components/Paragraph";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { PeerSelector } from "@components/PeerSelector";
import Separator from "@components/Separator";
import { uniqBy } from "lodash";
import { ExternalLinkIcon, PlusCircle } from "lucide-react";
import React, { useMemo, useState } from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { useRoutes } from "@/contexts/RoutesProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { Peer } from "@/interfaces/Peer";
import { GroupedRoute, Route } from "@/interfaces/Route";
import useGroupHelper from "@/modules/groups/useGroupHelper";

type Props = {
  groupedRoute?: GroupedRoute;
  modal: boolean;
  setModal: (modal: boolean) => void;
  peer?: Peer;
};

export default function RouteAddRoutingPeerModal({
  groupedRoute,
  modal,
  setModal,
  peer,
}: Props) {
  return (
    <Modal open={modal} onOpenChange={setModal}>
      {modal && (
        <Content
          onSuccess={() => setModal(false)}
          groupedRoute={groupedRoute}
          peer={peer}
        />
      )}
    </Modal>
  );
}

type ModalProps = {
  onSuccess?: (route: Route) => void;
  groupedRoute?: GroupedRoute;
  peer?: Peer;
};

function Content({ onSuccess, groupedRoute, peer }: ModalProps) {
  const { t } = useI18n();
  const { createRoute } = useRoutes();

  const [routingPeer, setRoutingPeer] = useState<Peer | undefined>(
    peer || undefined,
  );
  const [groups, setGroups, { getGroupsToUpdate }] = useGroupHelper({
    initial: [],
  });

  /**
   * Access Control Groups
   */
  const [
    accessControlGroups,
    setAccessControlGroups,
    { getGroupsToUpdate: getAccessControlGroupsToUpdate },
  ] = useGroupHelper({
    initial: [],
  });

  const [routeNetwork, setRouteNetwork] = useState<GroupedRoute | undefined>(
    groupedRoute,
  );

  const excludedPeers = useMemo(() => {
    if (!routeNetwork) return [];
    if (!routeNetwork.routes) return [];
    return routeNetwork.routes
      .map((r) => {
        if (!r.peer) return undefined;
        return r.peer;
      })
      .filter((p) => p != undefined) as string[];
  }, [routeNetwork]);

  // Add peer to route
  const createRouteHandler = async () => {
    if (!routeNetwork) return;
    // Create groups that do not exist
    const g2 = getGroupsToUpdate();
    const g3 = getAccessControlGroupsToUpdate();
    const createOrUpdateGroups = uniqBy([...g2, ...g3], "name").map(
      (g) => g.promise,
    );
    const createdGroups = await Promise.all(
      createOrUpdateGroups.map((call) => call()),
    );
    // Get distribution group ids
    const groupIds = groups
      .map((g) => {
        const find = createdGroups.find((group) => group.name === g.name);
        return find?.id;
      })
      .filter((g) => g !== undefined) as string[];

    let accessControlGroupIds: string[] | undefined = undefined;
    if (accessControlGroups.length > 0) {
      accessControlGroupIds = accessControlGroups
        .map((g) => {
          const find = createdGroups.find((group) => group.name === g.name);
          return find?.id;
        })
        .filter((g) => g !== undefined) as string[];
    }

    let useRange = false;
    if (routeNetwork?.domains) {
      useRange = routeNetwork.domains.length <= 0;
    } else {
      useRange = true;
    }

    createRoute(
      {
        network_id: routeNetwork.network_id,
        description: "",
        enabled: true,
        peer: routingPeer?.id || undefined,
        peer_groups: undefined,
        network: useRange ? routeNetwork.network : undefined,
        domains: useRange ? undefined : routeNetwork.domains,
        keep_route: routeNetwork.keep_route || false,
        metric: 9999,
        masquerade: true,
        groups: groupIds,
        access_control_groups: accessControlGroupIds || undefined,
      },
      onSuccess,
      t("routeAddRoutingPeer.success"),
    );
  };

  // Is button disabled
  const isDisabled = useMemo(() => {
    return !routingPeer || groups.length == 0 || !routeNetwork;
  }, [routingPeer, groups, routeNetwork]);

  const singleRoutingPeerGroups = useMemo(() => {
    if (!routingPeer) return [];
    return routingPeer?.groups;
  }, [routingPeer]);

  return (
    <ModalContent maxWidthClass={"max-w-2xl"}>
      <ModalHeader
        icon={<NetworkRoutesIcon className={"fill-netbird"} />}
        title={t("routeAddRoutingPeer.title")}
        description={t("routeAddRoutingPeer.description")}
        color={"netbird"}
      />

      <Separator />

      <div className={"flex flex-col gap-6 px-8 py-6"}>
        <div>
          <Label>{t("routeModal.networkIdentifier")}</Label>
          <HelpText>{t("routeAddRoutingPeer.networkHelp")}</HelpText>
          <NetworkRouteSelector
            disabled={groupedRoute != undefined}
            value={routeNetwork}
            onChange={setRouteNetwork}
          />
        </div>
        <div>
          <Label>{t("routeModal.routingPeer")}</Label>
          <HelpText>{t("routeModal.singlePeerRoute")}</HelpText>
          <PeerSelector
            onChange={setRoutingPeer}
            value={routingPeer}
            disabled={peer != undefined}
            excludedPeers={excludedPeers}
          />
        </div>
        <div>
          <Label>{t("routeModal.distributionGroups")}</Label>
          <HelpText>{t("routeModal.distributionGroupsHelp")}</HelpText>
          <PeerGroupSelector onChange={setGroups} values={groups} />
        </div>
        <div>
          <Label>{t("routeModal.accessControlGroupsOptional")}</Label>
          <HelpText>{t("routeUpdate.accessControlGroupsHelp")}</HelpText>
          <PeerGroupSelector
            onChange={setAccessControlGroups}
            values={accessControlGroups}
          />
        </div>
      </div>
      <ModalFooter className={"items-center"}>
        <div className={"w-full"}>
          <Paragraph className={"text-sm mt-auto"}>
            {t("common.learnMorePrefix")}{" "}
            <InlineLink
              href={
                "https://docs.netbird.io/how-to/routing-traffic-to-private-networks"
              }
              target={"_blank"}
            >
              {t("networkRoutesPage.title")}
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>{t("common.cancel")}</Button>
          </ModalClose>

          <Button
            variant={"primary"}
            disabled={isDisabled}
            onClick={createRouteHandler}
          >
            <PlusCircle size={16} />
            {t("routeAddRoutingPeer.addRoute")}
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
