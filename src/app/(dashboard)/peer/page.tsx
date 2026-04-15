"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import { Callout } from "@components/Callout";
import Card from "@components/Card";
import HelpText from "@components/HelpText";
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
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import LoginExpiredBadge from "@components/ui/LoginExpiredBadge";
import { PageNotFound } from "@components/ui/PageNotFound";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import useRedirect from "@hooks/useRedirect";
import useFetchApi from "@utils/api";
import dayjs from "dayjs";
import { isEmpty, trim } from "lodash";
import {
  ArrowRightIcon,
  Barcode,
  CalendarDays,
  Cpu,
  FlagIcon,
  Globe,
  History,
  ListIcon,
  MapPin,
  MonitorSmartphoneIcon,
  NetworkIcon,
  PencilIcon,
  RadioTowerIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toASCII } from "punycode";
import React, { useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { useSWRConfig } from "swr";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import CircleIcon from "@/assets/icons/CircleIcon";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import PeerIcon from "@/assets/icons/PeerIcon";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import { useCountries } from "@/contexts/CountryProvider";
import PeerProvider, { usePeer } from "@/contexts/PeerProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import RoutesProvider from "@/contexts/RoutesProvider";
import { useHasChanges } from "@/hooks/useHasChanges";
import type { Group } from "@/interfaces/Group";
import type { Peer } from "@/interfaces/Peer";
import PageContainer from "@/layouts/PageContainer";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { AccessiblePeersSection } from "@/modules/peer/AccessiblePeersSection";
import { PeerNetworkRoutesSection } from "@/modules/peer/PeerNetworkRoutesSection";
import { PeerRemoteJobsSection } from "@/modules/peer/PeerRemoteJobsSection";
import ReverseProxiesProvider, {
  flattenReverseProxies,
  useReverseProxies,
} from "@/contexts/ReverseProxiesProvider";
import { ReverseProxyFlatTargetsTabContent } from "@/modules/reverse-proxy/targets/flat/ReverseProxyFlatTargetsTabContent";
import { PeerSSHToggle } from "@/modules/peer/PeerSSHToggle";
import { RDPButton } from "@/modules/remote-access/rdp/RDPButton";
import { SSHButton } from "@/modules/remote-access/ssh/SSHButton";
import { PeerExpirationSettings } from "@/modules/peer/PeerExpirationSettings";
import { useI18n } from "@/i18n/I18nProvider";

export default function PeerPage() {
  const { t } = useI18n();
  const queryParameter = useSearchParams();
  const { isRestricted } = usePermissions();
  const peerId = queryParameter.get("id");
  const {
    data: peer,
    isLoading,
    error,
  } = useFetchApi<Peer>("/peers/" + peerId, true);

  useRedirect("/peers", false, !peerId || isRestricted);

  if (isRestricted) {
    return (
      <PageContainer>
        <RestrictedAccess page={t("peerDetails.title")} />
      </PageContainer>
    );
  }

  if (error)
    return (
      <PageNotFound
        title={error?.message}
        description={t("peerDetails.notFound")}
      />
    );

  return peer && peer.id && !isLoading ? (
    <ReverseProxiesProvider initialPeer={peer}>
      <PeerProvider peer={peer} key={peerId} isPeerDetailPage={true}>
        <PeerOverview key={peer?.id} />
      </PeerProvider>
    </ReverseProxiesProvider>
  ) : (
    <FullScreenLoading />
  );
}

function PeerOverview() {
  const { t } = useI18n();
  const { peer } = usePeer();

  return (
    <PageContainer>
      <RoutesProvider>
        <PeerSettingsProvider>
          <div className={"p-default py-6 pb-0"}>
            <Breadcrumbs>
              <Breadcrumbs.Item
                href={"/peers"}
                label={t("peers.title")}
                icon={<PeerIcon size={13} />}
              />
              <Breadcrumbs.Item label={peer.ip} active />
            </Breadcrumbs>
            <PeerHeader />
          </div>
          <PeerOverviewTabs />
        </PeerSettingsProvider>
      </RoutesProvider>
    </PageContainer>
  );
}

type PeerSettingsContextType = {
  selectedGroups: Group[];
  setSelectedGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  hasChanges: boolean;
  updatePeer: (newName?: string) => Promise<void>;
  name: string;
  setName: (name: string) => void;
  tab: string;
  setTab: (tab: string) => void;
};

const PeerSettingsContext = React.createContext<PeerSettingsContextType | null>(
  null,
);

const usePeerSettings = () => {
  const context = React.useContext(PeerSettingsContext);
  if (!context) {
    throw new Error("usePeerSettings must be used within PeerSettingsProvider");
  }
  return context;
};

const PeerSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const { t } = useI18n();
  const { mutate } = useSWRConfig();
  const { peer, peerGroups, update } = usePeer();
  const { permission } = usePermissions();
  const [name, setName] = useState(peer.name);
  const [tab, setTab] = useState("overview");
  const [selectedGroups, setSelectedGroups, { getAllGroupCalls }] =
    useGroupHelper({
      initial: peerGroups?.filter((g) => g?.name !== "All"),
      peer,
    });

  const { hasChanges, updateRef: updateHasChangedRef } = useHasChanges([
    selectedGroups,
  ]);

  const updatePeer = async (newName?: string) => {
    let batchCall: Promise<any>[] = [];
    const groupCalls = getAllGroupCalls();

    if (permission.peers.update) {
      const updateRequest = update({
        name: newName ?? name,
      });
      batchCall = groupCalls ? [...groupCalls, updateRequest] : [updateRequest];
    } else {
      batchCall = [...groupCalls];
    }

    notify({
      title: name,
      description: t("peerDetails.saved"),
      promise: Promise.all(batchCall).then(() => {
        mutate("/peers/" + peer.id);
        mutate("/groups");
        updateHasChangedRef([selectedGroups]);
      }),
      loadingMessage: t("peerDetails.saving"),
    });
  };

  return (
    <PeerSettingsContext.Provider
      value={{
        selectedGroups,
        setSelectedGroups,
        hasChanges,
        updatePeer,
        name,
        setName,
        tab,
        setTab,
      }}
    >
      {children}
    </PeerSettingsContext.Provider>
  );
};

const PeerHeader = () => {
  const { t } = useI18n();
  const router = useRouter();
  const { peer, user } = usePeer();
  const { permission } = usePermissions();
  const { name, setName, hasChanges, updatePeer, tab } = usePeerSettings();
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const isOverviewTab = tab === "overview";

  return (
    <>
      <div className={"flex justify-between max-w-6xl items-start"}>
        <div>
          <div className={"flex items-center gap-3"}>
            <h1 className={"flex items-center gap-3"}>
              <CircleIcon
                active={peer.connected}
                size={12}
                className={"mb-[3px] shrink-0"}
              />
              <TextWithTooltip text={name} maxChars={30} />

              {permission.peers.update && (
                <Modal
                  open={showEditNameModal}
                  onOpenChange={setShowEditNameModal}
                >
                  <ModalTrigger>
                    <div
                      className={
                        "flex h-8 w-8 items-center justify-center gap-2 dark:text-neutral-300 text-neutral-500 hover:text-neutral-100 transition-all hover:bg-nb-gray-800/60 rounded-md cursor-pointer"
                      }
                    >
                      <PencilIcon size={16} />
                    </div>
                  </ModalTrigger>
                  <EditNameModal
                    onSuccess={(newName) => {
                      updatePeer(newName).then(() => {
                        setName(newName);
                        setShowEditNameModal(false);
                      });
                    }}
                    peer={peer}
                    initialName={name}
                    key={showEditNameModal ? 1 : 0}
                  />
                </Modal>
              )}
            </h1>
            <LoginExpiredBadge loginExpired={peer.login_expired} />
          </div>
          {(user?.id || user?.email) && (
            <div className={"flex items-center gap-8"}>
              <Paragraph className={"flex items-center"}>
                <Link
                  href={`/team/user?id=${user?.id}`}
                  className={
                    "hover:text-nb-gray-200 transition-all flex items-center gap-1"
                  }
                >
                  {user?.email || user?.id}
                  <ArrowRightIcon size={14} />
                </Link>
              </Paragraph>
            </div>
          )}
        </div>
        {isOverviewTab && (
          <div className={"flex gap-4"}>
            <Button
              variant={"default"}
              className={"w-full"}
              onClick={() => router.push("/peers")}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              variant={"primary"}
              className={"w-full"}
              onClick={() => updatePeer()}
              disabled={
                !hasChanges ||
                !permission.peers.update ||
                !permission.groups.update
              }
            >
              {t("actions.saveChanges")}
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

const PeerOverviewTabs = () => {
  const { t } = useI18n();
  const { peer } = usePeer();
  const { permission } = usePermissions();
  const { reverseProxies, isLoading: isServicesLoading } = useReverseProxies();
  const { tab, setTab } = usePeerSettings();

  const flatTargets = useMemo(
    () => flattenReverseProxies({ reverseProxies, peer }),
    [reverseProxies, peer],
  );

  return (
    <Tabs
      defaultValue={tab}
      onValueChange={setTab}
      value={tab}
      className={"pt-4 pb-0 mb-0"}
    >
      <TabsList justify={"start"} className={"px-8"}>
        <TabsTrigger value={"overview"}>
          <ListIcon size={16} />
          {t("peerDetails.overview")}
        </TabsTrigger>

        {permission.routes.read && (
          <TabsTrigger value={"network-routes"}>
            <NetworkIcon size={16} />
            {t("networkRoutesPage.title")}
          </TabsTrigger>
        )}

        {peer?.id && permission.peers.read && (
          <TabsTrigger value={"accessible-peers"}>
            <MonitorSmartphoneIcon size={16} />
            {t("peerDetails.accessiblePeers")}
          </TabsTrigger>
        )}

        {peer?.id && permission.services?.read && (
          <TabsTrigger value={"reverse-proxies"}>
            <ReverseProxyIcon
              size={16}
              className="fill-nb-gray-400 group-data-[state=active]/trigger:fill-netbird"
            />
            {t("nav.services")}
          </TabsTrigger>
        )}

        {peer?.id && permission.peers.delete && (
          <TabsTrigger value={"peer-job"}>
            <RadioTowerIcon size={16} />
            {t("jobs.title")}
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value={"overview"} className={"pb-8"}>
        <PeerOverviewTabContent />
      </TabsContent>

      {permission.routes.read && (
        <TabsContent value={"network-routes"} className={"pb-8"}>
          <PeerNetworkRoutesSection peer={peer} />
        </TabsContent>
      )}

      {peer?.id && permission.peers.read && (
        <TabsContent value={"accessible-peers"} className={"pb-8"}>
          <AccessiblePeersSection peerID={peer.id} />
        </TabsContent>
      )}

      {peer?.id && permission.services?.read && (
        <TabsContent value={"reverse-proxies"} className={"pb-8"}>
          <ReverseProxyFlatTargetsTabContent
            targets={flatTargets}
            isLoading={isServicesLoading}
            hideResourceColumn
            emptyTableTitle={t("peerDetails.noServicesTitle")}
            emptyTableDescription={t("peerDetails.noServicesDescription")}
          />
        </TabsContent>
      )}

      {peer.id && permission.peers.delete && (
        <TabsContent value={"peer-job"} className={"pb-8"}>
          <PeerRemoteJobsSection peerID={peer.id} />
        </TabsContent>
      )}
    </Tabs>
  );
};

const PeerOverviewTabContent = () => {
  const { t } = useI18n();
  const { peer } = usePeer();
  const { permission } = usePermissions();
  const { selectedGroups, setSelectedGroups } = usePeerSettings();

  return (
    <div className={"px-8"}>
      <div
        className={
          "flex-wrap xl:flex-nowrap flex gap-10 w-full items-start pt-2 max-w-6xl"
        }
      >
        <PeerInformationCard peer={peer} />

        <div className={"flex flex-col gap-8 lg:w-1/2 transition-all"}>
          <PeerExpirationSettings />
          {permission.groups.read && (
            <div>
              <Label>{t("peerDetails.assignedGroups")}</Label>
              <HelpText>{t("peerDetails.assignedGroupsHelp")}</HelpText>
              <PeerGroupSelector
                disabled={!permission.groups.update}
                onChange={setSelectedGroups}
                values={selectedGroups}
                hideAllGroup={true}
                peer={peer}
              />
            </div>
          )}

          <PeerSSHToggle />

          {/* Remote Access Buttons */}
          <div>
            <Label>{t("peerDetails.remoteAccess")}</Label>
            <HelpText>{t("peerDetails.remoteAccessHelp")}</HelpText>
            <div className="flex gap-3">
              <SSHButton peer={peer} />
              <RDPButton peer={peer} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function PeerInformationCard({ peer }: Readonly<{ peer: Peer }>) {
  const { t } = useI18n();
  const { isLoading, getRegionByPeer } = useCountries();
  const { update } = usePeer();
  const { mutate } = useSWRConfig();
  const [showEditIPModal, setShowEditIPModal] = useState(false);
  const { permission } = usePermissions();

  const countryText = useMemo(() => {
    return getRegionByPeer(peer);
  }, [getRegionByPeer, peer]);

  return (
    <>
      <Modal open={showEditIPModal} onOpenChange={setShowEditIPModal}>
        <EditIPModal
          onSuccess={(newIP) => {
            notify({
              title: peer.name,
              description: t("peerDetails.ipUpdated"),
              promise: update({ ip: newIP }).then(() => {
                mutate("/peers/" + peer.id);
                setShowEditIPModal(false);
              }),
              loadingMessage: t("peerDetails.ipUpdating"),
            });
          }}
          peer={peer}
          key={showEditIPModal ? 1 : 0}
        />
      </Modal>
      <Card className={"w-full xl:w-1/2"}>
        <Card.List>
          <Card.ListItem
            copy
            tooltip={false}
            copyText={t("peerDetails.netbirdIpAddress")}
            label={
              <>
                <MapPin size={16} />
                {t("peerDetails.netbirdIpAddress")}
              </>
            }
            valueToCopy={peer.ip}
            value={
              <div className="flex items-center gap-2 justify-between w-full">
                <span>{peer.ip}</span>
                {permission.peers.update && (
                  <button
                    className="flex w-7 h-7 items-center justify-center gap-2 text-nb-gray-400 hover:text-neutral-100 transition-all hover:bg-nb-gray-800/60 rounded-md cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEditIPModal(true);
                    }}
                  >
                    <PencilIcon size={14} />
                  </button>
                )}
              </div>
            }
          />

          <Card.ListItem
            copy
            copyText={t("peerDetails.publicIpAddress")}
            label={
              <>
                <NetworkIcon size={16} />
                {t("peerDetails.publicIpAddress")}
              </>
            }
            value={peer.connection_ip}
          />

          <Card.ListItem
            copy
            copyText={t("peerDetails.dnsLabel")}
            label={
              <>
                <Globe size={16} />
                {t("peerDetails.domainName")}
              </>
            }
            className={
              peer?.extra_dns_labels && peer.extra_dns_labels.length > 0
                ? "items-start"
                : ""
            }
            value={peer.dns_label}
            extraText={peer?.extra_dns_labels}
          />

          <Card.ListItem
            copy
            copyText={t("peerDetails.hostname")}
            label={
              <>
                <MonitorSmartphoneIcon size={16} />
                {t("peerDetails.hostname")}
              </>
            }
            value={peer.hostname}
          />

          <Card.ListItem
            label={
              <>
                <FlagIcon size={16} />
                {t("peerDetails.region")}
              </>
            }
            tooltip={false}
            value={
              isEmpty(peer.country_code) ? (
                t("peerDetails.unknown")
              ) : (
                <>
                  {isLoading ? (
                    <Skeleton width={140} />
                  ) : (
                    <div className={"flex gap-2 items-center"}>
                      <div
                        className={"border-0 border-nb-gray-800 rounded-full"}
                      >
                        <RoundedFlag country={peer.country_code} size={12} />
                      </div>
                      {countryText}
                    </div>
                  )}
                </>
              )
            }
          />

          <Card.ListItem
            label={
              <>
                <Cpu size={16} />
                {t("peerDetails.operatingSystem")}
              </>
            }
            value={peer.os}
          />

          {peer.serial_number && peer.serial_number !== "" && (
            <Card.ListItem
              label={
                <>
                  <Barcode size={16} />
                  {t("peerDetails.serialNumber")}
                </>
              }
              value={peer.serial_number}
            />
          )}

          {peer.created_at && (
            <Card.ListItem
              label={
                <>
                  <CalendarDays size={16} />
                  {t("peerDetails.registeredOn")}
                </>
              }
              value={
                dayjs(peer.created_at).format(t("peerDetails.dateTimeFormat")) +
                " (" +
                dayjs().to(peer.created_at) +
                ")"
              }
            />
          )}

          <Card.ListItem
            label={
              <>
                <History size={16} />
                {t("peerDetails.lastSeen")}
              </>
            }
              value={
                peer.connected
                  ? t("peerDetails.justNow")
                  : dayjs(peer.last_seen).format(t("peerDetails.dateTimeFormat")) +
                  " (" +
                  dayjs().to(peer.last_seen) +
                  ")"
            }
          />

          <Card.ListItem
            label={
              <>
                <NetBirdIcon size={16} />
                {t("peerDetails.agentVersion")}
              </>
            }
            value={peer.version}
          />

          {peer.ui_version && (
            <Card.ListItem
              label={
                <>
                  <NetBirdIcon size={16} />
                  {t("peerDetails.uiVersion")}
                </>
              }
              value={peer.ui_version?.replace("netbird-desktop-ui/", "")}
            />
          )}
        </Card.List>
      </Card>
    </>
  );
}

interface ModalProps {
  onSuccess: (name: string) => void;
  peer: Peer;
  initialName: string;
}

function EditNameModal({ onSuccess, peer, initialName }: Readonly<ModalProps>) {
  const { t } = useI18n();
  const [name, setName] = useState(initialName);

  const isDisabled = useMemo(() => {
    if (name === peer.name) return true;
    const trimmedName = trim(name);
    return trimmedName.length === 0;
  }, [name, peer]);

  const domainNamePreview = useMemo(() => {
    let punyName = toASCII(name.toLowerCase());
    punyName = punyName.replace(/[^a-z0-9]/g, "-");
    let domain = "";
    if (peer.dns_label) {
      const labelList = peer.dns_label.split(".");
      if (labelList.length > 1) {
        labelList.splice(0, 1);
        domain = "." + labelList.join(".");
      }
    }
    return punyName + domain;
  }, [name, peer]);

  return (
    <ModalContent maxWidthClass={"max-w-md"}>
      <form>
        <ModalHeader
          title={t("peerDetails.editNameTitle")}
          description={t("peerDetails.editNameDescription")}
          color={"blue"}
        />

        <div className={"p-default flex flex-col gap-4"}>
          <div>
            <Input
              placeholder={t("peerDetails.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Card className={"w-full px-6 pt-5 pb-4"}>
            <Label>
              <Globe size={15} />
              {t("peerDetails.domainPreview")}
            </Label>
            <HelpText className={"mt-2"}>
              {t("peerDetails.domainPreviewHelp")}
            </HelpText>
            <div className={"text-netbird text-sm break-all whitespace-normal"}>
              {domainNamePreview}
            </div>
          </Card>
        </div>

        <ModalFooter className={"items-center"} separator={false}>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"} className={"w-full"}>
                {t("actions.cancel")}
              </Button>
            </ModalClose>

            <Button
              variant={"primary"}
              className={"w-full"}
              onClick={() => onSuccess(name)}
              disabled={isDisabled}
              type={"submit"}
            >
              {t("actions.save")}
            </Button>
          </div>
        </ModalFooter>
      </form>
    </ModalContent>
  );
}

interface EditIPModalProps {
  onSuccess: (ip: string) => void;
  peer: Peer;
}

function EditIPModal({ onSuccess, peer }: Readonly<EditIPModalProps>) {
  const { t } = useI18n();
  const [ip, setIP] = useState(peer.ip);
  const [error, setError] = useState("");

  const validateIP = (ipAddress: string) => {
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ipAddress);
  };

  const isDisabled = useMemo(() => {
    if (ip === peer.ip) return true;
    const trimmedIP = trim(ip);
    return trimmedIP.length === 0 || !validateIP(ip);
  }, [ip, peer.ip]);

  React.useEffect(() => {
    switch (true) {
      case ip === peer.ip:
        setError("");
        break;
      case !validateIP(ip):
        setError(t("peerDetails.validIpError"));
        break;
      default:
        setError("");
        break;
    }
  }, [ip, peer.ip]);

  return (
    <ModalContent maxWidthClass={"max-w-md"}>
      <form>
        <ModalHeader
          title={t("peerDetails.editIpTitle")}
          description={t("peerDetails.editIpDescription")}
          color={"blue"}
        />

        <div className={"p-default flex flex-col gap-4"}>
          <div>
            <Input
              placeholder={t("peerDetails.ipPlaceholder")}
              value={ip}
              onChange={(e) => setIP(e.target.value)}
              error={error}
            />
          </div>

          <Callout>{t("peerDetails.reconnectNotice")}</Callout>
        </div>

        <ModalFooter className={"items-center"} separator={false}>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"} className={"w-full"}>
                {t("actions.cancel")}
              </Button>
            </ModalClose>

            <Button
              variant={"primary"}
              className={"w-full"}
              onClick={() => onSuccess(ip)}
              disabled={isDisabled}
            >
              {t("actions.save")}
            </Button>
          </div>
        </ModalFooter>
      </form>
    </ModalContent>
  );
}
