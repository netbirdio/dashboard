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
import { cn } from "@utils/helpers";
import { uniqBy } from "lodash";
import {
  ArrowDownWideNarrow,
  ExternalLinkIcon,
  Power,
  RouteIcon,
  Settings2,
  Text,
  VenetianMask,
} from "lucide-react";
import React, { useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { useGroupRoute } from "@/contexts/GroupRouteProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePeers } from "@/contexts/PeersProvider";
import { useRoutes } from "@/contexts/RoutesProvider";
import { Peer } from "@/interfaces/Peer";
import { Route } from "@/interfaces/Route";
import useGroupHelper from "@/modules/groups/useGroupHelper";

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
  const { updateRoute } = useRoutes();
  const { peers } = usePeers();
  const { groups: allGroups } = useGroups();
  const { groupedRoute } = useGroupRoute();
  const { mutate } = useSWRConfig();

  // General
  const [description, setDescription] = useState(route.description || "");

  // Network
  const [routingPeer, setRoutingPeer] = useState<Peer | undefined>(() => {
    if (route.peer && peers) {
      return peers.find((p) => p.id === route.peer);
    }
    return undefined;
  });

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

  // Additional Settings
  const [enabled, setEnabled] = useState<boolean>(route?.enabled ?? true);
  const [metric, setMetric] = useState(route?.metric || "9999");
  const [masquerade, setMasquerade] = useState<boolean>(
    route?.masquerade ?? true,
  );

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
    const createOrUpdateGroups = uniqBy([...g1, ...g2], "name").map(
      (g) => g.promise,
    );
    const createdGroups = await Promise.all(
      createOrUpdateGroups.map((call) => call()),
    );
    const peerGroups = routingPeerGroups
      .map((g) => {
        const find = createdGroups.find((group) => group.name === g.name);
        return find?.id;
      })
      .filter((g) => g !== undefined) as string[];
    const groupIds = groups
      .map((g) => {
        const find = createdGroups.find((group) => group.name === g.name);
        return find?.id;
      })
      .filter((g) => g !== undefined) as string[];

    const useSinglePeer = peerTab === "routing-peer";

    updateRoute(
      route,
      {
        id: route.id,
        description: description || "",
        enabled: enabled,
        peer: useSinglePeer ? routingPeer?.id : undefined,
        peer_groups: useSinglePeer ? undefined : peerGroups || undefined,
        metric: Number(metric) || 9999,
        masquerade: masquerade,
        groups: groupIds,
      },
      (r) => {
        onSuccess && onSuccess(r);
        mutate("/routes");
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

  // Is button disabled
  const isDisabled = useMemo(() => {
    return (
      (peerTab === "peer-group" && routingPeerGroups.length == 0) ||
      (peerTab === "routing-peer" && !routingPeer) ||
      groups.length == 0
    );
  }, [peerTab, routingPeerGroups.length, routingPeer, groups]);

  const [tab, setTab] = useState(
    cell && cell == "metric" ? "settings" : "network",
  );

  return (
    <ModalContent maxWidthClass={"max-w-xl"}>
      <ModalHeader
        icon={<NetworkRoutesIcon className={"fill-netbird"} />}
        title={"Update " + route.network_id}
        description={route.network}
        color={"netbird"}
      />

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
            Route
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
            Description
          </TabsTrigger>
          <TabsTrigger value={"settings"}>
            <Settings2
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value={"network"} className={"pb-8"}>
          <div className={"px-8 flex-col flex gap-6"}>
            {route.peer ? (
              <div>
                <Label>Routing Peer</Label>
                <HelpText>
                  Assign a single peer as a routing peer for the Network CIDR.
                </HelpText>
                <PeerSelector
                  onChange={setRoutingPeer}
                  value={routingPeer}
                  excludedPeers={excludedPeers}
                />
              </div>
            ) : (
              <div>
                <Label>Peer Group</Label>
                <HelpText>
                  Assign peer group with Linux machines to be used as routing
                  peers.
                </HelpText>
                <PeerGroupSelector
                  max={1}
                  onChange={setRoutingPeerGroups}
                  values={routingPeerGroups}
                />
              </div>
            )}

            <div>
              <Label>Distribution Groups</Label>
              <HelpText>
                Advertise this route to peers that belong to the following
                groups
              </HelpText>
              <PeerGroupSelector onChange={setGroups} values={groups} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value={"general"} className={"px-8 pb-6"}>
          <div className={"flex flex-col gap-6"}>
            <div>
              <Label>Description (optional)</Label>
              <HelpText>
                Write a short description to add more context to this route.
              </HelpText>
              <Textarea
                placeholder={
                  "e.g., Route to access all devices in the AWS VPC, located in Frankfurt."
                }
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
                  Enable Route
                </>
              }
              helpText={"Use this switch to enable or disable the route."}
            />
            <FancyToggleSwitch
              value={masquerade}
              onChange={setMasquerade}
              label={
                <>
                  <VenetianMask size={15} />
                  Masquerade
                </>
              }
              helpText={
                "Allow access to your private networks without configuring routes on your local routers or other devices."
              }
            />
            <div className={cn("flex justify-between")}>
              <div>
                <Label>Metrics</Label>
                <HelpText className={"max-w-[200px]"}>
                  Lower metrics indicating higher priority routes.
                </HelpText>
              </div>

              <Input
                min={1}
                max={9999}
                maxWidthClass={"max-w-[200px]"}
                value={metric}
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
            Learn more about
            <InlineLink
              href={
                "https://docs.netbird.io/how-to/routing-traffic-to-private-networks"
              }
              target={"_blank"}
            >
              Network Routes
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
            disabled={isDisabled}
            onClick={updateRouteHandler}
          >
            Save Changes
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
