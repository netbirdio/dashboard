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
  ModalTrigger,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import Paragraph from "@components/Paragraph";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { PeerSelector } from "@components/PeerSelector";
import { SegmentedTabs } from "@components/SegmentedTabs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { Textarea } from "@components/Textarea";
import { cn } from "@utils/helpers";
import cidr from "ip-cidr";
import { uniqBy } from "lodash";
import {
  ArrowDownWideNarrow,
  ExternalLinkIcon,
  FolderGit2,
  MonitorSmartphoneIcon,
  NetworkIcon,
  PlusCircle,
  Power,
  RouteIcon,
  Settings2,
  Text,
  VenetianMask,
} from "lucide-react";
import React, { useMemo, useRef, useState } from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { useRoutes } from "@/contexts/RoutesProvider";
import { Peer } from "@/interfaces/Peer";
import { Route } from "@/interfaces/Route";
import useGroupHelper from "@/modules/groups/useGroupHelper";

type Props = {
  children?: React.ReactNode;
};

export default function RouteModal({ children }: Props) {
  const [modal, setModal] = useState(false);

  return (
    <>
      <Modal open={modal} onOpenChange={setModal} key={modal ? 1 : 0}>
        {children && <ModalTrigger asChild>{children}</ModalTrigger>}
        {modal && <RouteModalContent onSuccess={() => setModal(false)} />}
      </Modal>
    </>
  );
}

type ModalProps = {
  onSuccess?: (route: Route) => void;
  peer?: Peer;
};

export function RouteModalContent({ onSuccess, peer }: ModalProps) {
  const { createRoute } = useRoutes();

  // General
  const [networkIdentifier, setNetworkIdentifier] = useState("");
  const [description, setDescription] = useState("");

  // Network
  const [networkRange, setNetworkRange] = useState("");
  const [routingPeer, setRoutingPeer] = useState<Peer | undefined>(peer);

  const [
    routingPeerGroups,
    setRoutingPeerGroups,
    { getGroupsToUpdate: getAllRoutingGroupsToUpdate },
  ] = useGroupHelper({
    initial: [],
  });

  const [groups, setGroups, { getGroupsToUpdate }] = useGroupHelper({
    initial: [],
  });

  // Additional Settings
  const [enabled, setEnabled] = useState<boolean>(true);
  const [metric, setMetric] = useState("9999");
  const [masquerade, setMasquerade] = useState<boolean>(true);

  // Validate CIDR
  const cidrError = useMemo(() => {
    if (networkRange == "") return "";
    const validCIDR = cidr.isValidAddress(networkRange);
    if (!validCIDR) return "Please enter a valid CIDR, e.g., 192.168.1.0/24";
  }, [networkRange]);

  // Refs to manage focus on tab change
  const networkRangeRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [peerTab, setPeerTab] = useState("routing-peer");

  // Create route
  // TODO Refactor to avoid duplicate code
  const createRouteHandler = async () => {
    const g1 = getAllRoutingGroupsToUpdate();
    const g2 = getGroupsToUpdate();
    const createOrUpdateGroups = uniqBy([...g1, ...g2], "name").map(
      (g) => g.promise,
    );
    const createdGroups = await Promise.all(createOrUpdateGroups);
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

    createRoute(
      {
        network_id: networkIdentifier,
        description: description || "",
        enabled: enabled,
        peer: useSinglePeer ? routingPeer?.id : undefined,
        peer_groups: useSinglePeer ? undefined : peerGroups || undefined,
        network: networkRange,
        metric: Number(metric) || 9999,
        masquerade: masquerade,
        groups: groupIds,
      },
      onSuccess,
    );
  };

  // Is button disabled
  const isDisabled = useMemo(() => {
    return (
      networkIdentifier == "" ||
      (cidrError && cidrError.length > 1) ||
      (peerTab === "peer-group" && routingPeerGroups.length == 0) ||
      (peerTab === "routing-peer" && !routingPeer) ||
      groups.length == 0
    );
  }, [
    networkIdentifier,
    cidrError,
    peerTab,
    routingPeerGroups.length,
    routingPeer,
    groups,
  ]);

  const [tab, setTab] = useState("network");

  return (
    <ModalContent maxWidthClass={"max-w-xl"}>
      <ModalHeader
        icon={<NetworkRoutesIcon className={"fill-netbird"} />}
        title={"Create New  Route"}
        description={"Access LANs and VPC by adding a network route."}
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
            Name & Description
          </TabsTrigger>
          <TabsTrigger value={"settings"}>
            <Settings2
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Additional Settings
          </TabsTrigger>
        </TabsList>
        <TabsContent value={"general"} className={"px-8 pb-6"}>
          <div className={"flex flex-col gap-6"}>
            <div>
              <Label>Network Identifier</Label>
              <HelpText>
                Add a unique network identifier that is assigned to each device.
              </HelpText>
              <Input
                autoFocus={true}
                tabIndex={0}
                ref={nameRef}
                placeholder={"e.g., aws-eu-central-1-vpc"}
                value={networkIdentifier}
                onChange={(e) => setNetworkIdentifier(e.target.value)}
              />
            </div>
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
        <TabsContent value={"network"} className={"pb-8"}>
          <div className={"px-8 flex-col flex gap-6"}>
            <div>
              <Label>Network Range</Label>
              <HelpText>Add a private IP address range</HelpText>
              <Input
                ref={networkRangeRef}
                customPrefix={<NetworkIcon size={16} />}
                placeholder={"e.g., 172.16.0.0/16"}
                value={networkRange}
                className={"font-mono !text-[13px]"}
                error={cidrError}
                onChange={(e) => setNetworkRange(e.target.value)}
              />
            </div>
            <SegmentedTabs value={peerTab} onChange={setPeerTab}>
              <SegmentedTabs.List>
                <SegmentedTabs.Trigger value={"routing-peer"}>
                  <MonitorSmartphoneIcon size={16} />
                  Routing Peer
                </SegmentedTabs.Trigger>

                <SegmentedTabs.Trigger value={"peer-group"} disabled={!!peer}>
                  <FolderGit2 size={16} />
                  Peer Group
                </SegmentedTabs.Trigger>
              </SegmentedTabs.List>
              <SegmentedTabs.Content value={"routing-peer"}>
                <div>
                  <HelpText>
                    Assign a single peer as a routing peer for the Network CIDR.
                  </HelpText>
                  <PeerSelector
                    onChange={setRoutingPeer}
                    value={routingPeer}
                    disabled={!!peer}
                  />
                </div>
              </SegmentedTabs.Content>
              <SegmentedTabs.Content value={"peer-group"}>
                <div>
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
              </SegmentedTabs.Content>
            </SegmentedTabs>
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
            onClick={createRouteHandler}
          >
            <PlusCircle size={16} />
            Add Route
          </Button>
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
