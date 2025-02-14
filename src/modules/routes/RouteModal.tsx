"use client";

import Button from "@components/Button";
import ButtonGroup from "@components/ButtonGroup";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import FullTooltip from "@components/FullTooltip";
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
import InputDomain, { domainReducer } from "@components/ui/InputDomain";
import { IconDirectionSign } from "@tabler/icons-react";
import { cn } from "@utils/helpers";
import cidr from "ip-cidr";
import { uniqBy } from "lodash";
import {
  ArrowDownWideNarrow,
  CircleHelp,
  ExternalLinkIcon,
  FolderGit2,
  GlobeIcon,
  GlobeLockIcon,
  MonitorSmartphoneIcon,
  NetworkIcon,
  PlusCircle,
  PlusIcon,
  Power,
  RouteIcon,
  Settings2,
  Text,
  VenetianMask,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { useDialog } from "@/contexts/DialogProvider";
import { useRoutes } from "@/contexts/RoutesProvider";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import { Route } from "@/interfaces/Route";
import { AccessControlModalContent } from "@/modules/access-control/AccessControlModal";
import useGroupHelper from "@/modules/groups/useGroupHelper";

type Props = {
  children?: React.ReactNode;
  open?: boolean;
  setOpen?: (open: boolean) => void;
};

export default function RouteModal({ children, open, setOpen }: Props) {
  const { confirm } = useDialog();
  const router = useRouter();
  const [routePolicyModal, setRoutePolicyModal] = useState(false);
  const [newPolicy, setNewPolicy] = useState<Policy>();

  const handleCreatePolicyPrompt = async (r: Route) => {
    if (!r?.access_control_groups) return;

    const choice = await confirm({
      title: `Do you want to create a new access control policy for the route '${r.network_id}'?`,
      description:
        "You have one or more access control groups added to this route. These groups allow you to limit access to this route by using them in access policies.",
      confirmText: "Create Policy",
      cancelText: "Later",
      type: "default",
    });
    if (!choice) return;

    const name = `${r.network_id} Policy`;
    const newPolicy: Policy = {
      name,
      description: "",
      enabled: true,
      source_posture_checks: [],
      rules: [
        {
          name,
          description: "",
          sources: r?.groups || [],
          destinations: r?.access_control_groups || [],
          enabled: true,
          bidirectional: false,
          action: "accept",
          protocol: "all",
          ports: [],
        },
      ],
    };
    setNewPolicy(newPolicy);
    setRoutePolicyModal(true);
  };

  return (
    <>
      <Modal open={open} onOpenChange={setOpen} key={open ? 1 : 0}>
        {children && <ModalTrigger asChild>{children}</ModalTrigger>}
        {open && (
          <RouteModalContent
            onSuccess={async (r) => {
              await handleCreatePolicyPrompt(r);
              setOpen?.(false);
            }}
          />
        )}
      </Modal>

      <Modal open={routePolicyModal} onOpenChange={setRoutePolicyModal}>
        {routePolicyModal && newPolicy != undefined && (
          <AccessControlModalContent
            onSuccess={() => {
              router.push("/access-control");
            }}
            policy={newPolicy}
          />
        )}
      </Modal>
    </>
  );
}

type ModalProps = {
  onSuccess?: (route: Route) => void;
  peer?: Peer;
  exitNode?: boolean;
  isFirstExitNode?: boolean;
};

export function RouteModalContent({
  onSuccess,
  peer,
  exitNode,
  isFirstExitNode = false,
}: ModalProps) {
  const { createRoute } = useRoutes();
  const [tab, setTab] = useState(
    exitNode && peer ? "access-control" : "network",
  );

  /**
   * Network Identifier, Description & Network Range
   */
  const [networkIdentifier, setNetworkIdentifier] = useState(
    exitNode
      ? peer
        ? `Exit Node (${
            peer.name.length > 25
              ? peer.name.substring(0, 25) + "..."
              : peer.name
          })`
        : "Exit Node"
      : "",
  );
  const [description, setDescription] = useState("");
  const [networkRange, setNetworkRange] = useState(exitNode ? "0.0.0.0/0" : "");
  const [routingPeer, setRoutingPeer] = useState<Peer | undefined>(peer);
  const [
    routingPeerGroups,
    setRoutingPeerGroups,
    { getGroupsToUpdate: getAllRoutingGroupsToUpdate },
  ] = useGroupHelper({
    initial: [],
  });

  /**
   * DNS Routes
   * IP Range or Domain Tab = ip-range or domains
   */
  const [domainRoutes, setDomainRoutes] = useReducer(domainReducer, []);
  const [domainError, setDomainError] = useState<boolean>(false);
  const [routeType, setRouteTyp] = useState<string>("ip-range");
  const [keepRoute, setKeepRoute] = useState<boolean>(true);

  const isMasqueradeDisabled = useMemo(() => {
    if (exitNode) return true;
    return routeType === "domains";
  }, [exitNode, routeType]);

  const isDomainOrRangeEntered = useMemo(() => {
    if (routeType === "ip-range") return networkRange !== "";
    const isEmptyDomain = domainRoutes.some((d) => d.name === "");
    const isAtLeastOneDomain = domainRoutes.length > 0;
    return !isEmptyDomain && isAtLeastOneDomain && !domainError;
  }, [domainRoutes, routeType, networkRange, domainError]);

  // Enable Masquerade if domain route type is selected
  useEffect(() => {
    if (routeType === "domains") setMasquerade(true);
  }, [routeType]);

  /**
   * Distribution Groups
   */
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

  /**
   * Additional Settings
   */
  const [enabled, setEnabled] = useState<boolean>(true);
  const [metric, setMetric] = useState("9999");
  const [masquerade, setMasquerade] = useState<boolean>(true);

  /**
   * Create Route
   */
  const createRouteHandler = async () => {
    // Create groups that do not exist
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

    const domainRouteNames =
      routeType === "domains"
        ? domainRoutes.map((d) => d.name).filter((d) => d !== "")
        : undefined;
    const useKeepRoute = routeType === "domains" ? keepRoute : undefined;

    createRoute(
      {
        network_id: networkIdentifier,
        description: description || "",
        enabled: enabled,
        peer: useSinglePeer ? routingPeer?.id : undefined,
        peer_groups: useSinglePeer ? undefined : peerGroups || undefined,
        network: routeType === "ip-range" ? networkRange : undefined,
        domains: domainRouteNames,
        keep_route: useKeepRoute,
        metric: Number(metric) || 9999,
        masquerade: masquerade,
        groups: groupIds,
        access_control_groups: accessControlGroupIds || undefined,
      },
      onSuccess,
    );
  };

  /**
   * Refs to manage input focus on tab change
   */
  const networkRangeRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [peerTab, setPeerTab] = useState("routing-peer");

  /**
   * Validate CIDR Range
   */
  const cidrError = useMemo(() => {
    if (networkRange == "") return "";
    const validCIDR = cidr.isValidAddress(networkRange);
    if (!validCIDR) return "Please enter a valid CIDR, e.g., 192.168.1.0/24";
  }, [networkRange]);

  const isGroupsEntered = useMemo(() => {
    return groups.length > 0;
  }, [groups]);

  /**
   * Allow to create route only when all fields are filled
   */
  const isNetworkEntered = useMemo(() => {
    return !(
      (cidrError && cidrError.length > 1) ||
      (peerTab === "peer-group" && routingPeerGroups.length == 0) ||
      (peerTab === "routing-peer" && !routingPeer) ||
      !isDomainOrRangeEntered
    );
  }, [
    cidrError,
    peerTab,
    routingPeerGroups.length,
    routingPeer,
    isDomainOrRangeEntered,
  ]);

  const networkIdentifierError = useMemo(() => {
    return (networkIdentifier?.length || 0) > 40
      ? "Network Identifier must be less than 40 characters"
      : "";
  }, [networkIdentifier]);

  const metricError = useMemo(() => {
    return parseInt(metric) < 1 || parseInt(metric) > 9999
      ? "Metric must be between 1 and 9999"
      : "";
  }, [metric]);

  const isNameEntered = useMemo(() => {
    return networkIdentifier != "" && networkIdentifierError == "";
  }, [networkIdentifier, networkIdentifierError]);

  const canCreateOrSave = useMemo(() => {
    return isNetworkEntered && isNameEntered && metricError == "";
  }, [isNetworkEntered, isNameEntered, metricError]);

  const singleRoutingPeerGroups = useMemo(() => {
    if (!routingPeer) return [];
    return routingPeer?.groups;
  }, [routingPeer]);

  return (
    <ModalContent maxWidthClass={"max-w-2xl"}>
      <ModalHeader
        icon={
          exitNode ? (
            <IconDirectionSign size={20} />
          ) : (
            <NetworkRoutesIcon className={"fill-netbird"} />
          )
        }
        title={
          exitNode
            ? isFirstExitNode
              ? "Set Up Exit Node"
              : "Add Exit Node"
            : "Create New  Route"
        }
        truncate={!!peer}
        description={
          exitNode
            ? peer
              ? `Route all traffic through the peer '${peer.name}'`
              : "Route all internet traffic through a peer"
            : "Access LANs and VPC by adding a network route."
        }
        color={exitNode ? "yellow" : "netbird"}
      />

      <Tabs defaultValue={tab} onValueChange={(v) => setTab(v)} value={tab}>
        <TabsList justify={"start"} className={"px-8"}>
          {!(exitNode && peer) && (
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
          )}

          <TabsTrigger value={"access-control"} disabled={!isNetworkEntered}>
            <FolderGit2
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Groups
          </TabsTrigger>
          <TabsTrigger
            value={"general"}
            disabled={!isGroupsEntered}
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
          <TabsTrigger
            value={"settings"}
            disabled={!isNetworkEntered || !isNameEntered || !isGroupsEntered}
          >
            <Settings2
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            Additional Settings
          </TabsTrigger>
        </TabsList>
        <TabsContent value={"network"} className={"pb-8"}>
          <div className={"px-8 flex-col flex gap-4"}>
            <div className={cn(exitNode && "hidden")}>
              <Label>Route Type</Label>
              <HelpText>
                Select your route type to add either a network range or a list
                of domains.
              </HelpText>
              <div className={"flex justify-between items-center w-full"}>
                <ButtonGroup className={"w-full"}>
                  <ButtonGroup.Button
                    variant={routeType == "ip-range" ? "tertiary" : "secondary"}
                    onClick={() => setRouteTyp("ip-range")}
                    className={"w-full"}
                  >
                    <NetworkIcon size={16} />
                    Network Range
                  </ButtonGroup.Button>
                  <ButtonGroup.Button
                    variant={routeType == "domains" ? "tertiary" : "secondary"}
                    onClick={() => setRouteTyp("domains")}
                    className={"w-full"}
                  >
                    <GlobeIcon size={16} />
                    Domains
                  </ButtonGroup.Button>
                </ButtonGroup>
              </div>

              <div
                className={cn(
                  "mt-5 mb-3",
                  routeType !== "ip-range" && "hidden",
                )}
              >
                <Label>Network Range</Label>
                <HelpText>Add a private IPv4 address range</HelpText>
                <Input
                  ref={networkRangeRef}
                  customPrefix={<NetworkIcon size={16} />}
                  placeholder={"e.g., 172.16.0.0/16"}
                  value={networkRange}
                  data-cy={"network-range"}
                  className={"font-mono !text-[13px]"}
                  error={cidrError}
                  onChange={(e) => setNetworkRange(e.target.value)}
                />
              </div>

              <div
                className={cn("mt-5 mb-3", routeType !== "domains" && "hidden")}
              >
                <Label>Domains</Label>
                <HelpText>
                  Add domains that dynamically resolve to one or more IPv4
                  addresses. <br /> A maximum of 32 domains can be added.
                </HelpText>
                <div>
                  {domainRoutes.length > 0 && (
                    <div className={"flex gap-3 w-full mb-3"}>
                      <div className={"flex flex-col gap-2 w-full"}>
                        {domainRoutes.map((domain, i) => {
                          return (
                            <InputDomain
                              key={domain.id}
                              value={domain}
                              data-cy={`domain-input-${i}`}
                              onChange={(d) =>
                                setDomainRoutes({
                                  type: "UPDATE",
                                  index: i,
                                  d,
                                })
                              }
                              onError={setDomainError}
                              onRemove={() =>
                                setDomainRoutes({
                                  type: "REMOVE",
                                  index: i,
                                })
                              }
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <Button
                    variant={"dotted"}
                    className={"w-full"}
                    size={"sm"}
                    disabled={domainRoutes.length === 32}
                    data-cy={"add-domain"}
                    onClick={() => setDomainRoutes({ type: "ADD" })}
                  >
                    <PlusIcon size={14} />
                    Add Domain
                  </Button>
                </div>
                <div className={cn("mt-6 w-full")}>
                  <FullTooltip
                    side={"top"}
                    content={
                      <div className={"text-xs max-w-xs"}>
                        DNS records for load-balanced systems often change.
                        Keeping resolved addresses ensures ongoing connections
                        to active resources remain uninterrupted.
                      </div>
                    }
                    className={"w-full block"}
                  >
                    <FancyToggleSwitch
                      value={keepRoute}
                      onChange={setKeepRoute}
                      label={
                        <>
                          <div className={"flex gap-2"}>
                            <GlobeLockIcon size={14} />
                            Keep Routes
                            <CircleHelp
                              size={12}
                              className={"top-[1px] relative text-nb-gray-300"}
                            />
                          </div>
                        </>
                      }
                      helpText={
                        <div>
                          Retain previously resolved routes after IP address
                          updates to maintain stable connections.
                        </div>
                      }
                    />
                  </FullTooltip>
                </div>
              </div>
            </div>

            {exitNode && peer ? (
              <></>
            ) : (
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
                      Assign a single peer as a routing peer for the
                      {exitNode ? " exit node." : " network route."}
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
                      Assign a peer group with Linux machines to be used as
                      {exitNode ? " exit nodes." : " routing peers."}
                    </HelpText>
                    <PeerGroupSelector
                      max={1}
                      onChange={setRoutingPeerGroups}
                      values={routingPeerGroups}
                    />
                  </div>
                </SegmentedTabs.Content>
              </SegmentedTabs>
            )}
          </div>
        </TabsContent>
        <TabsContent value={"access-control"} className={"pb-8"}>
          <div className={"px-8 flex-col flex gap-6"}>
            <div>
              <Label>Distribution Groups</Label>
              <HelpText>
                {exitNode
                  ? peer
                    ? `Route all internet traffic through this peer for the following groups`
                    : `Route all internet traffic through the peer(s) for the following groups`
                  : "Advertise this route to peers that belong to the following groups"}
              </HelpText>
              <PeerGroupSelector onChange={setGroups} values={groups} />
            </div>
            <div>
              <Label>Access Control Groups (optional)</Label>
              <HelpText>
                These groups allow you to limit access to this route. Simply use
                these groups as a destination when creating access policies.
              </HelpText>
              <PeerGroupSelector
                dataCy={"access-control-groups-selector"}
                onChange={setAccessControlGroups}
                values={accessControlGroups}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value={"general"} className={"px-8 pb-6"}>
          <div className={"flex flex-col gap-6"}>
            <div>
              <Label>Network Identifier</Label>
              <HelpText>
                Add a unique network identifier that is assigned to each device.
              </HelpText>
              <Input
                error={networkIdentifierError}
                autoFocus={true}
                data-cy={"network-identifier"}
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
                data-cy={"description"}
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
            {!exitNode && (
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
            )}

            <div className={cn("flex justify-between")}>
              <div>
                <Label>Metric</Label>
                <HelpText className={"max-w-[200px]"}>
                  A lower metric indicates higher priority routes.
                </HelpText>
              </div>

              <Input
                min={1}
                max={9999}
                maxWidthClass={"max-w-[200px]"}
                value={metric}
                error={metricError}
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
                exitNode
                  ? "https://docs.netbird.io/how-to/configuring-default-routes-for-internet-traffic"
                  : "https://docs.netbird.io/how-to/routing-traffic-to-private-networks"
              }
              target={"_blank"}
            >
              {exitNode ? "Exit Nodes" : "Network Routes"}
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          {tab == "network" && (
            <ModalClose asChild={true}>
              <Button variant={"secondary"}>Cancel</Button>
            </ModalClose>
          )}

          {tab == "access-control" && (
            <Button variant={"secondary"} onClick={() => setTab("network")}>
              Back
            </Button>
          )}

          {tab == "general" && (
            <Button
              variant={"secondary"}
              onClick={() => setTab("access-control")}
            >
              Back
            </Button>
          )}

          {tab == "settings" && (
            <Button variant={"secondary"} onClick={() => setTab("general")}>
              Back
            </Button>
          )}

          {tab == "network" && (
            <Button
              variant={"primary"}
              onClick={() => setTab("access-control")}
              disabled={!isNetworkEntered}
            >
              Continue
            </Button>
          )}
          {tab == "access-control" && (
            <Button
              variant={"primary"}
              onClick={() => setTab("general")}
              disabled={!isGroupsEntered}
            >
              Continue
            </Button>
          )}
          {tab == "general" && (
            <Button
              variant={"primary"}
              onClick={() => setTab("settings")}
              disabled={!isNameEntered || !isNetworkEntered}
            >
              Continue
            </Button>
          )}
          {tab == "settings" && (
            <Button
              variant={"primary"}
              disabled={!canCreateOrSave}
              data-cy={"submit-route"}
              onClick={createRouteHandler}
            >
              <PlusCircle size={16} />
              {exitNode ? "Add Exit Node" : "Add Route"}
            </Button>
          )}
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
