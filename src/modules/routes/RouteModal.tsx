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
import { getOperatingSystem } from "@hooks/useOperatingSystem";
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { useDialog } from "@/contexts/DialogProvider";
import { useRoutes } from "@/contexts/RoutesProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { Group } from "@/interfaces/Group";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { Peer } from "@/interfaces/Peer";
import { Policy } from "@/interfaces/Policy";
import { Route } from "@/interfaces/Route";
import { AccessControlModalContent } from "@/modules/access-control/AccessControlModal";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { RoutingPeerMasqueradeSwitch } from "@/modules/networks/routing-peers/RoutingPeerMasqueradeSwitch";

type Props = {
  children?: React.ReactNode;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  distributionGroups?: Group[];
};

export default function RouteModal({
  children,
  open,
  setOpen,
  distributionGroups,
}: Props) {
  const { t } = useI18n();
  const { confirm } = useDialog();
  const router = useRouter();
  const [routePolicyModal, setRoutePolicyModal] = useState(false);
  const [newPolicy, setNewPolicy] = useState<Policy>();

  const handleCreatePolicyPrompt = async (r: Route) => {
    if (!r?.access_control_groups) return;

    const choice = await confirm({
      title: t("routeModal.createPolicyTitle", { name: r.network_id }),
      description: t("routeModal.createPolicyDescription"),
      confirmText: t("routeModal.createPolicy"),
      cancelText: t("routeModal.later"),
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
            distributionGroups={distributionGroups}
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
  distributionGroups?: Group[];
};

export function RouteModalContent({
  onSuccess,
  peer,
  exitNode,
  isFirstExitNode = false,
  distributionGroups,
}: ModalProps) {
  const { t } = useI18n();
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
    initial: distributionGroups ?? [],
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
  const [isForced, setIsForced] = useState<boolean>(true);

  const isNonLinuxRoutingPeer = useMemo(() => {
    if (!routingPeer) return false;
    return getOperatingSystem(routingPeer.os) != OperatingSystem.LINUX;
  }, [routingPeer]);

  useEffect(() => {
    if (isNonLinuxRoutingPeer) setMasquerade(true);
  }, [isNonLinuxRoutingPeer]);

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
        masquerade: useSinglePeer && isNonLinuxRoutingPeer ? true : masquerade,
        groups: groupIds,
        access_control_groups: accessControlGroupIds || undefined,
        skip_auto_apply: !isForced,
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
    if (!validCIDR) return t("routeModal.validCidrError");
  }, [networkRange, t]);

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
      ? t("routeModal.networkIdentifierError")
      : "";
  }, [networkIdentifier, t]);

  const metricError = useMemo(() => {
    return parseInt(metric) < 1 || parseInt(metric) > 9999
      ? t("routeModal.metricError")
      : "";
  }, [metric, t]);

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
              ? t("routeModal.setupExitNode")
              : t("routeModal.addExitNode")
            : t("routeModal.createRoute")
        }
        truncate={!!peer}
        description={
          exitNode
            ? peer
              ? t("routeModal.routeAllTrafficPeer", { name: peer.name })
              : t("routeModal.routeAllTraffic")
            : t("routeModal.description")
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
              {t("routeModal.routeTab")}
            </TabsTrigger>
          )}

          <TabsTrigger value={"access-control"} disabled={!isNetworkEntered}>
            <FolderGit2
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            {t("routeModal.groupsTab")}
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
            {t("routeModal.generalTab")}
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
            {t("routeModal.settingsTab")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value={"network"} className={"pb-8"}>
          <div className={"px-8 flex-col flex gap-4"}>
            <div className={cn(exitNode && "hidden")}>
              <Label>{t("routeModal.routeType")}</Label>
              <HelpText>{t("routeModal.routeTypeHelp")}</HelpText>
              <div className={"flex justify-between items-center w-full"}>
                <ButtonGroup className={"w-full"}>
                  <ButtonGroup.Button
                    variant={routeType == "ip-range" ? "tertiary" : "secondary"}
                    onClick={() => setRouteTyp("ip-range")}
                    className={"w-full"}
                  >
                    <NetworkIcon size={16} />
                    {t("routeModal.networkRange")}
                  </ButtonGroup.Button>
                  <ButtonGroup.Button
                    variant={routeType == "domains" ? "tertiary" : "secondary"}
                    onClick={() => setRouteTyp("domains")}
                    className={"w-full"}
                  >
                    <GlobeIcon size={16} />
                    {t("routeModal.domains")}
                  </ButtonGroup.Button>
                </ButtonGroup>
              </div>

              <div
                className={cn(
                  "mt-5 mb-3",
                  routeType !== "ip-range" && "hidden",
                )}
              >
                <Label>{t("routeModal.networkRange")}</Label>
                <HelpText>{t("routeModal.networkRangeHelp")}</HelpText>
                <Input
                  ref={networkRangeRef}
                  customPrefix={<NetworkIcon size={16} />}
                  placeholder={t("routeModal.networkRangePlaceholder")}
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
                <Label>{t("routeModal.domains")}</Label>
                <HelpText>{t("routeModal.domainsHelp")}</HelpText>
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
                    {t("routeModal.addDomain")}
                  </Button>
                </div>
                <div className={cn("mt-6 w-full")}>
                  <FullTooltip
                    side={"top"}
                    content={
                      <div className={"text-xs max-w-xs"}>
                        {t("routeModal.keepRoutesTooltip")}
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
                            {t("routeModal.keepRoutes")}
                            <CircleHelp
                              size={12}
                              className={"top-[1px] relative text-nb-gray-300"}
                            />
                          </div>
                        </>
                      }
                      helpText={
                        <div>{t("routeModal.keepRoutesHelp")}</div>
                      }
                    />
                  </FullTooltip>
                </div>
              </div>
            </div>

            {exitNode && peer ? (
              <></>
            ) : (
              <SegmentedTabs
                value={peerTab}
                onChange={(state) => {
                  setPeerTab(state);
                  setRoutingPeer(undefined);
                  setRoutingPeerGroups([]);
                }}
              >
                <SegmentedTabs.List>
                  <SegmentedTabs.Trigger value={"routing-peer"}>
                    <MonitorSmartphoneIcon size={16} />
                    {t("routeModal.routingPeer")}
                  </SegmentedTabs.Trigger>

                  <SegmentedTabs.Trigger value={"peer-group"} disabled={!!peer}>
                    <FolderGit2 size={16} />
                    {t("routeModal.peerGroup")}
                  </SegmentedTabs.Trigger>
                </SegmentedTabs.List>
                <SegmentedTabs.Content value={"routing-peer"}>
                  <div>
                    <HelpText>
                      {exitNode
                        ? t("routeModal.singlePeerExitNode")
                        : t("routeModal.singlePeerRoute")}
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
                      {exitNode
                        ? t("routeModal.peerGroupExitNode")
                        : t("routeModal.peerGroupRoute")}
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
              <Label>{t("routeModal.distributionGroups")}</Label>
              <HelpText>
                {exitNode
                  ? peer
                    ? t("routeModal.distributionGroupsPeerHelp")
                    : t("routeModal.distributionGroupsPeersHelp")
                  : t("routeModal.distributionGroupsHelp")}
              </HelpText>
              <PeerGroupSelector onChange={setGroups} values={groups} />
            </div>
            <div>
              <Label>{t("routeModal.accessControlGroupsOptional")}</Label>
              <HelpText>{t("routeModal.accessControlGroupsHelp")}</HelpText>
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
              <Label>{t("routeModal.networkIdentifier")}</Label>
              <HelpText>{t("routeModal.networkIdentifierHelp")}</HelpText>
              <Input
                error={networkIdentifierError}
                autoFocus={true}
                data-cy={"network-identifier"}
                tabIndex={0}
                ref={nameRef}
                placeholder={t("routeModal.networkIdentifierPlaceholder")}
                value={networkIdentifier}
                onChange={(e) => setNetworkIdentifier(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("routeModal.descriptionOptional")}</Label>
              <HelpText>{t("routeModal.descriptionHelp")}</HelpText>
              <Textarea
                data-cy={"description"}
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

            {exitNode && (
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

            {!exitNode && (
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
                  {t("routeModal.metricHelp")}
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
            {t("common.learnMorePrefix")}{" "}
            <InlineLink
              href={
                exitNode
                  ? "https://docs.netbird.io/how-to/configuring-default-routes-for-internet-traffic"
                  : "https://docs.netbird.io/how-to/routing-traffic-to-private-networks"
              }
              target={"_blank"}
            >
              {exitNode ? t("routeModal.exitNodes") : t("networkRoutesPage.title")}
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          {(tab == "network" || (tab == "access-control" && exitNode)) && (
            <ModalClose asChild={true}>
              <Button variant={"secondary"}>{t("actions.cancel")}</Button>
            </ModalClose>
          )}

          {tab == "access-control" && !exitNode && (
            <Button variant={"secondary"} onClick={() => setTab("network")}>
              {t("actions.back")}
            </Button>
          )}

          {tab == "general" && (
            <Button
              variant={"secondary"}
              onClick={() => setTab("access-control")}
            >
              {t("actions.back")}
            </Button>
          )}

          {tab == "settings" && (
            <Button variant={"secondary"} onClick={() => setTab("general")}>
              {t("actions.back")}
            </Button>
          )}

          {tab == "network" && (
            <Button
              variant={"primary"}
              onClick={() => setTab("access-control")}
              disabled={!isNetworkEntered}
            >
              {t("actions.continue")}
            </Button>
          )}
          {tab == "access-control" && (
            <Button
              variant={"primary"}
              onClick={() => setTab("general")}
              disabled={!isGroupsEntered}
            >
              {t("actions.continue")}
            </Button>
          )}
          {tab == "general" && (
            <Button
              variant={"primary"}
              onClick={() => setTab("settings")}
              disabled={!isNameEntered || !isNetworkEntered}
            >
              {t("actions.continue")}
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
              {exitNode ? t("routeModal.addExitNode") : t("routeActions.addRoute")}
            </Button>
          )}
        </div>
      </ModalFooter>
    </ModalContent>
  );
}
