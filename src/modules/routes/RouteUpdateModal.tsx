"use client";

import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
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
import Paragraph from "@components/Paragraph";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { PeerSelector } from "@components/PeerSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { Textarea } from "@components/Textarea";
import { DomainsTooltip } from "@components/ui/DomainListBadge";
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import { IconDirectionSign } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import { uniqBy } from "lodash";
import {
  ArrowDownWideNarrow,
  ExternalLinkIcon,
  Power,
  RouteIcon,
  Settings2,
  Text,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { useGroupRoute } from "@/contexts/GroupRouteProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePeers } from "@/contexts/PeersProvider";
import { useRoutes } from "@/contexts/RoutesProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { Peer } from "@/interfaces/Peer";
import { Route } from "@/interfaces/Route";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { RoutingPeerMasqueradeSwitch } from "@/modules/networks/routing-peers/RoutingPeerMasqueradeSwitch";

type Props = {
  route: Route;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  cell?: string;
};

export default function RouteUpdateModal({
  route,
  open,
  onOpenChange,
  cell,
}: Props) {
  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} key={open ? 1 : 0}>
        {open && (
          <RouteUpdateModalContent
            onSuccess={() => onOpenChange && onOpenChange(false)}
            route={route}
            cell={cell}
          />
        )}
      </Modal>
    </>
  );
}

type ModalProps = {
  onSuccess?: (route: Route) => void;
  route: Route;
  cell?: string;
};

function RouteUpdateModalContent({ onSuccess, route, cell }: ModalProps) {
  const { t } = useI18n();
  const { updateRoute } = useRoutes();
  const { peers } = usePeers();
  const { groups: allGroups } = useGroups();
  const { groupedRoute } = useGroupRoute();
  const { mutate } = useSWRConfig();

  // General
  const [description, setDescription] = useState(route.description || "");

  const isExitNode = useMemo(() => {
    return route?.network === "0.0.0.0/0";
  }, [route]);

  const isUsingDomains = useMemo(() => {
    try {
      return route?.domains && route.domains.length > 0;
    } catch (e) {
      return false;
    }
  }, [route]);

  const routeType = useMemo(() => {
    if (isUsingDomains) return "domains";
    return "ip-range";
  }, [isUsingDomains]);

  // Network
  const [routingPeer, setRoutingPeer] = useState<Peer | undefined>(() => {
    if (route.peer && peers) {
      return peers.find((p) => p.id === route.peer);
    }
    return undefined;
  });

  const isNonLinuxRoutingPeer = useMemo(() => {
    if (!routingPeer) return false;
    return getOperatingSystem(routingPeer.os) != OperatingSystem.LINUX;
  }, [routingPeer]);

  useEffect(() => {
    if (isNonLinuxRoutingPeer) setMasquerade(true);
  }, [isNonLinuxRoutingPeer]);

  const isMasqueradeDisabled = useMemo(() => {
    if (isExitNode) return true;
    return routeType === "domains";
  }, [isExitNode, routeType]);

  const initialRoutingPeerGroups = useMemo(() => {
    if (!route) return [];
    if (route?.peer_groups && allGroups) {
      return allGroups.filter((g) => {
        if (!route.peer_groups) return [];
        return route.peer_groups && g.id
          ? route.peer_groups.includes(g.id)
          : false;
      });
    }
    return [];
  }, [route, allGroups]);

  const [
    routingPeerGroups,
    setRoutingPeerGroups,
    { getGroupsToUpdate: getAllRoutingGroupsToUpdate },
  ] = useGroupHelper({
    initial: initialRoutingPeerGroups,
  });

  const initialGroups = useMemo(() => {
    if (!route) return [];
    if (route?.groups && allGroups) {
      return allGroups.filter((g) => {
        if (!route.groups) return [];
        return route.groups && g.id ? route.groups.includes(g.id) : false;
      });
    }
    return [];
  }, [route, allGroups]);

  const [groups, setGroups, { getGroupsToUpdate }] = useGroupHelper({
    initial: initialGroups,
  });

  /**
   * Access Control Groups
   */

  const initialAccessControlGroups = useMemo(() => {
    if (!route) return [];
    if (route?.access_control_groups && allGroups) {
      return allGroups.filter((g) => {
        if (!route?.access_control_groups) return [];
        return route?.access_control_groups && g.id
          ? route.access_control_groups.includes(g.id)
          : false;
      });
    }
    return [];
  }, [route, allGroups]);

  const [
    accessControlGroups,
    setAccessControlGroups,
    { getGroupsToUpdate: getAccessControlGroupsToUpdate },
  ] = useGroupHelper({
    initial: initialAccessControlGroups,
  });

  // Additional Settings
  const [enabled, setEnabled] = useState<boolean>(route?.enabled ?? true);
  const [metric, setMetric] = useState(route?.metric || "9999");
  const [masquerade, setMasquerade] = useState<boolean>(
    route?.masquerade ?? true,
  );
  const [isForced, setIsForced] = useState<boolean>(route?.skip_auto_apply === false);

  // Refs to manage focus on tab change
  const networkRangeRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [peerTab] = useState(
    route ? (route?.peer ? "routing-peer" : "peer-group") : "routing-peer",
  );

  // Update route
  // TODO Refactor to avoid duplicate code
  const updateRouteHandler = async () => {
    const g1 = getAllRoutingGroupsToUpdate();
    const g2 = getGroupsToUpdate();
    const g3 = getAccessControlGroupsToUpdate();
    const createOrUpdateGroups = uniqBy([...g1, ...g2, ...g3], "name").map(
      (g) => g.promise,
    );
    const createdGroups = await Promise.all(
      createOrUpdateGroups.map((call) => call()),
    );
    // Check if routing peer is selected
    const useSinglePeer = peerTab === "routing-peer";

    // Get group ids of peer groups
    let peerGroups: string[] = [];
    if (!useSinglePeer) {
      peerGroups = routingPeerGroups
        .map((g) => {
          const find = createdGroups.find((group) => group.name === g.name);
          return find?.id;
        })
        .filter((g) => g !== undefined) as string[];
    }

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

    updateRoute(
      route,
      {
        id: route.id,
        description: description || "",
        enabled: enabled,
        peer: useSinglePeer ? routingPeer?.id : undefined,
        peer_groups: useSinglePeer ? undefined : peerGroups || undefined,
        metric: Number(metric) || 9999,
        masquerade: useSinglePeer && isNonLinuxRoutingPeer ? true : masquerade,
        groups: groupIds,
        access_control_groups: accessControlGroupIds || undefined,
        skip_auto_apply: !isForced,
      },
      (r) => {
        onSuccess && onSuccess(r);
        mutate("/routes");
      },
      undefined,
      {
        remove_access_control_groups: !accessControlGroupIds,
      },
    );
  };

  const excludedPeers = useMemo(() => {
    if (!groupedRoute.routes) return [];
    return groupedRoute.routes
      .map((r) => {
        if (!r.peer) return undefined;
        return r.peer;
      })
      .filter((p) => p != undefined) as string[];
  }, [groupedRoute]);

  const metricError = useMemo(() => {
    return parseInt(metric.toString()) < 1 || parseInt(metric.toString()) > 9999
      ? t("routeModal.metricError")
      : "";
  }, [metric, t]);

  // Is button disabled
  const isDisabled = useMemo(() => {
    return (
      (peerTab === "peer-group" && routingPeerGroups.length == 0) ||
      (peerTab === "routing-peer" && !routingPeer) ||
      groups.length == 0 ||
      metricError !== ""
    );
  }, [peerTab, routingPeerGroups.length, routingPeer, groups, metricError]);

  const [tab, setTab] = useState(
    cell && cell == "metric" ? "settings" : "network",
  );

  const routeInfo = useMemo(() => {
    let hasDomains = route?.domains ? route.domains.length > 0 : false;
    try {
      if (hasDomains && route?.domains) {
        return route?.domains.join(", ");
      } else {
        return route.network;
      }
    } catch (e) {
      return route.network;
    }
  }, [route]);

  const singleRoutingPeerGroups = useMemo(() => {
    if (!routingPeer) return [];
    return routingPeer?.groups;
  }, [routingPeer]);

  return (
    <ModalContent maxWidthClass={"max-w-2xl"}>
      <ModalHeader
        icon={<NetworkRoutesIcon className={"fill-netbird"} />}
        title={t("routeUpdate.title", { name: route.network_id })}
        description={routeInfo}
        color={"netbird"}
        truncate={true}
      >
        {route?.domains && (
          <DomainsTooltip domains={route.domains} className={"block"}>
            <Paragraph className={cn("text-sm", "!block truncate")}>
              {routeInfo}
            </Paragraph>
          </DomainsTooltip>
        )}
      </ModalHeader>

      <Tabs defaultValue={tab} onValueChange={(v) => setTab(v)}>
        <TabsList justify={"start"} className={"px-8"}>
          <TabsTrigger
            value={"network"}
            onClick={() => networkRangeRef.current?.focus()}
          >
            <RouteIcon
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            {t("routeModal.routeTab")}
          </TabsTrigger>
          <TabsTrigger
            value={"general"}
            onClick={() => nameRef.current?.focus()}
          >
            <Text
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            {t("routeUpdate.descriptionTab")}
          </TabsTrigger>
          <TabsTrigger value={"settings"}>
            <Settings2
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            {t("routeUpdate.settingsTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={"network"} className={"pb-8"}>
          <div className={"px-8 flex-col flex gap-6"}>
            {route.peer ? (
              <div>
                <Label>{t("routeModal.routingPeer")}</Label>
                <HelpText>
                  {isExitNode
                    ? t("routeModal.singlePeerExitNode")
                    : t("routeModal.singlePeerRoute")}
                </HelpText>
                <PeerSelector
                  onChange={setRoutingPeer}
                  value={routingPeer}
                  excludedPeers={excludedPeers}
                />
              </div>
            ) : (
              <div>
                <Label>{t("routeModal.peerGroup")}</Label>
                <HelpText>
                  {isExitNode
                    ? t("routeModal.peerGroupExitNode")
                    : t("routeModal.peerGroupRoute")}
                </HelpText>
                <PeerGroupSelector
                  max={1}
                  onChange={setRoutingPeerGroups}
                  values={routingPeerGroups}
                />
              </div>
            )}

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
        </TabsContent>
        <TabsContent value={"general"} className={"px-8 pb-6"}>
          <div className={"flex flex-col gap-6"}>
            <div>
              <Label>{t("routeModal.descriptionOptional")}</Label>
              <HelpText>{t("routeModal.descriptionHelp")}</HelpText>
              <Textarea
                placeholder={t("routeModal.descriptionPlaceholder")}
                value={description}
                rows={3}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value={"settings"} className={"pb-4"}>
          <div className={"px-8 flex flex-col gap-6"}>
            <FancyToggleSwitch
              value={enabled}
              onChange={setEnabled}
              label={
                <>
                  <Power size={15} />
                  {t("routeModal.enableRoute")}
                </>
              }
              helpText={t("routeModal.enableRouteHelp")}
            />

            {isExitNode && (
                              <FancyToggleSwitch
                  value={isForced}
                  onChange={setIsForced}
                  label={
                    <>
                      <IconDirectionSign size={15} />
                      {t("routeModal.autoApplyRoute")}
                    </>
                  }
                  helpText={t("routeModal.autoApplyRouteHelp")}
                />
            )}

            {!isExitNode && (
              <RoutingPeerMasqueradeSwitch
                value={masquerade}
                onChange={setMasquerade}
                disabled={isNonLinuxRoutingPeer}
                routingPeerGroupId={routingPeerGroups?.[0]?.id}
              />
            )}
            <div className={cn("flex justify-between")}>
              <div>
                <Label>{t("networkRouting.metric")}</Label>
                <HelpText className={"max-w-[200px]"}>
                  {t("routeUpdate.metricHelp")}
                </HelpText>
              </div>

              <Input
                min={1}
                max={9999}
                maxWidthClass={"max-w-[200px]"}
                value={metric}
                error={metricError}
                errorTooltip={true}
                type={"number"}
                onChange={(e) => setMetric(e.target.value)}
                customPrefix={
                  <ArrowDownWideNarrow
                    size={16}
                    className={"text-nb-gray-300"}
                  />
                }
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

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
            <Button variant={"secondary"}>{t("actions.cancel")}</Button>
          </ModalClose>

          <Button
            variant={"primary"}
            disabled={isDisabled}
            onClick={updateRouteHandler}
          >
            {t("actions.saveChanges")}
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
