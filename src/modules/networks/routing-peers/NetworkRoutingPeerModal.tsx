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
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { PeerSelector } from "@components/PeerSelector";
import { SegmentedTabs } from "@components/SegmentedTabs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import useFetchApi, { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { uniqBy } from "lodash";
import {
  ArrowDownWideNarrow,
  ExternalLinkIcon,
  FolderGit2,
  MonitorSmartphoneIcon,
  PlusCircle,
  Settings2,
  Share2Icon,
  VenetianMask,
} from "lucide-react";
import React, { useState } from "react";
import { Network, NetworkRouter } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import useGroupHelper from "@/modules/groups/useGroupHelper";

type Props = {
  network: Network;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  onCreated?: (r: NetworkRouter) => void;
  onUpdated?: (r: NetworkRouter) => void;
  router?: NetworkRouter;
};

export default function NetworkRoutingPeerModal({
  network,
  open,
  setOpen,
  onCreated,
  onUpdated,
  router,
}: Props) {
  return (
    <Modal open={open} onOpenChange={setOpen}>
      <RoutingPeerModalContent
        network={network}
        router={router}
        onCreated={onCreated}
        onUpdated={onUpdated}
        key={open ? "1" : "0"}
      />
    </Modal>
  );
}

type ContentProps = {
  network: Network;
  router?: NetworkRouter;
  onCreated?: (r: NetworkRouter) => void;
  onUpdated?: (r: NetworkRouter) => void;
};

function RoutingPeerModalContent({
  network,
  router,
  onCreated,
  onUpdated,
}: ContentProps) {
  const isRoutingPeer = router ? router.peer != "" : true;

  const [tab, setTab] = useState("router");
  const [type, setType] = useState(isRoutingPeer ? "peer" : "group");

  const create = useApiCall<NetworkRouter>(
    `/networks/${network.id}/routers`,
  ).post;
  const update = useApiCall<NetworkRouter>(
    `/networks/${network.id}/routers/${router?.id}`,
  ).put;

  const { data: peer } = useFetchApi<Peer>(
    "/peers/" + router?.peer,
    true,
    false,
    router ? router.peer != "" : false,
  );

  const [routingPeer, setRoutingPeer] = useState<Peer | undefined>(peer);

  const [
    routingPeerGroups,
    setRoutingPeerGroups,
    { getGroupsToUpdate: getAllRoutingGroupsToUpdate },
  ] = useGroupHelper({
    initial: router?.peer_groups || [],
  });

  const [masquerade, setMasquerade] = useState<boolean>(
    router?.masquerade || true,
  );
  const [metric, setMetric] = useState(
    router?.metric ? router.metric.toString() : "9999",
  );

  const addRouter = async () => {
    // Create groups that do not exist
    const g1 = getAllRoutingGroupsToUpdate();
    const createOrUpdateGroups = uniqBy([...g1], "name").map((g) => g.promise);
    const createdGroups = await Promise.all(
      createOrUpdateGroups.map((call) => call()),
    );

    // Check if routing peer is selected
    const isRoutingPeer = type === "peer";

    notify({
      title: "Network Routing Peer",
      description: "Routing Peer added successfully.",
      loadingMessage: "Adding Routing Peer...",
      promise: create({
        peer: isRoutingPeer ? routingPeer?.id : undefined,
        peer_groups: !isRoutingPeer
          ? createdGroups.map((g) => g.id)
          : undefined,
        metric: parseInt(metric),
        masquerade,
      }).then((r) => {
        onCreated?.(r);
      }),
    });
  };

  const updateRouter = async () => {
    // Create groups that do not exist
    const g1 = getAllRoutingGroupsToUpdate();
    const createOrUpdateGroups = uniqBy([...g1], "name").map((g) => g.promise);
    const createdGroups = await Promise.all(
      createOrUpdateGroups.map((call) => call()),
    );

    // Check if routing peer is selected
    const isRoutingPeer = type === "peer";

    notify({
      title: "Network Routing Peer",
      description: "Routing Peer added successfully.",
      loadingMessage: "Adding Routing Peer...",
      promise: update({
        peer: isRoutingPeer ? routingPeer?.id : undefined,
        peer_groups: !isRoutingPeer
          ? createdGroups.map((g) => g.id)
          : undefined,
        metric: parseInt(metric),
        masquerade,
      }).then((r) => {
        onUpdated?.(r);
      }),
    });
  };

  return (
    <ModalContent maxWidthClass={"max-w-xl"}>
      <ModalHeader
        icon={<Share2Icon size={16} />}
        title={router ? "Update Routing Peer" : "Add Routing Peer"}
        description={`Route traffic to '${network.name}'`}
        color={"netbird"}
      />

      <Tabs defaultValue={tab} onValueChange={(v) => setTab(v)} value={tab}>
        <TabsList justify={"between"} className={"px-8 justify-between w-full"}>
          <TabsTrigger value={"router"}>
            <Share2Icon
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Routers
          </TabsTrigger>

          <TabsTrigger value={"settings"} className={"ml-auto"}>
            <Settings2
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Advanced Settings
          </TabsTrigger>
        </TabsList>
        <TabsContent value={"router"} className={"pb-8"}>
          <div className={"flex flex-col gap-4 px-8 "}>
            <SegmentedTabs value={type} onChange={setType}>
              <SegmentedTabs.List>
                <SegmentedTabs.Trigger value={"peer"}>
                  <MonitorSmartphoneIcon size={16} />
                  Routing Peers
                </SegmentedTabs.Trigger>

                <SegmentedTabs.Trigger value={"group"}>
                  <FolderGit2 size={16} />
                  Peer Group
                </SegmentedTabs.Trigger>
              </SegmentedTabs.List>
              <SegmentedTabs.Content value={"peer"}>
                <div>
                  <HelpText>
                    Assign a single or multiple peers as a routing peers for the
                    network.
                  </HelpText>
                  <PeerSelector onChange={setRoutingPeer} value={routingPeer} />
                </div>
              </SegmentedTabs.Content>
              <SegmentedTabs.Content value={"group"}>
                <div>
                  <HelpText>
                    Assign a peer group with Linux machines to be used as
                    routing peers.
                  </HelpText>
                  <PeerGroupSelector
                    max={1}
                    onChange={setRoutingPeerGroups}
                    values={routingPeerGroups}
                  />
                </div>
              </SegmentedTabs.Content>
            </SegmentedTabs>
          </div>
        </TabsContent>

        <TabsContent value={"settings"} className={"pb-4"}>
          <div className={"px-8 flex flex-col gap-6"}>
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
                <Label>Metric</Label>
                <HelpText className={"max-w-[200px]"}>
                  A lower metric indicates higher priority routing peers.
                </HelpText>
              </div>

              <Input
                min={1}
                max={9999}
                maxWidthClass={"max-w-[200px]"}
                value={metric}
                data-cy={"metric"}
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
            Learn more about
            <InlineLink
              href={
                "https://docs.netbird.io/how-to/networks-concept#routing-peers"
              }
              target={"_blank"}
            >
              Routing Peers
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          <ModalClose asChild={true}>
            <Button variant={"secondary"}>Cancel</Button>
          </ModalClose>
          {tab == "router" && (
            <Button variant={"primary"} onClick={() => setTab("settings")}>
              Continue
            </Button>
          )}
          {tab == "settings" && (
            <Button
              variant={"primary"}
              disabled={
                routingPeer == undefined && routingPeerGroups.length <= 0
              }
              onClick={router ? updateRouter : addRouter}
            >
              {router ? (
                <>Save Changes</>
              ) : (
                <>
                  <PlusCircle size={16} />
                  Add Routing Peer
                </>
              )}
            </Button>
          )}
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
