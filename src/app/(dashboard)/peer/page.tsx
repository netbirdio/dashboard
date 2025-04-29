"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import Card from "@components/Card";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import FullTooltip from "@components/FullTooltip";
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
import Separator from "@components/Separator";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import LoginExpiredBadge from "@components/ui/LoginExpiredBadge";
import TextWithTooltip from "@components/ui/TextWithTooltip";
import useRedirect from "@hooks/useRedirect";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import dayjs from "dayjs";
import { isEmpty, trim } from "lodash";
import {
  Barcode,
  Cpu,
  FlagIcon,
  Globe,
  History,
  LockIcon,
  MapPin,
  MonitorSmartphoneIcon,
  NetworkIcon,
  PencilIcon,
  TerminalSquare,
  TimerResetIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toASCII } from "punycode";
import React, { useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { useSWRConfig } from "swr";
import RoundedFlag from "@/assets/countries/RoundedFlag";
import CircleIcon from "@/assets/icons/CircleIcon";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import PeerIcon from "@/assets/icons/PeerIcon";
import { useCountries } from "@/contexts/CountryProvider";
import PeerProvider, { usePeer } from "@/contexts/PeerProvider";
import RoutesProvider from "@/contexts/RoutesProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { useHasChanges } from "@/hooks/useHasChanges";
import type { Peer } from "@/interfaces/Peer";
import PageContainer from "@/layouts/PageContainer";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { AccessiblePeersSection } from "@/modules/peer/AccessiblePeersSection";
import { PeerExpirationToggle } from "@/modules/peer/PeerExpirationToggle";
import { PeerNetworkRoutesSection } from "@/modules/peer/PeerNetworkRoutesSection";

export default function PeerPage() {
  const queryParameter = useSearchParams();
  const peerId = queryParameter.get("id");
  const { data: peer, isLoading } = useFetchApi<Peer>("/peers/" + peerId, true);

  useRedirect("/peers", false, !peerId);

  const peerKey = useMemo(() => {
    let id = peer?.id ?? "";
    let ssh = peer?.ssh_enabled ? "1" : "0";
    let expiration = peer?.login_expiration_enabled ? "1" : "0";
    return `${id}-${ssh}-${expiration}`;
  }, [peer]);

  return peer && !isLoading ? (
    <PeerProvider peer={peer} key={peerId}>
      <PeerOverview key={peerKey} />
    </PeerProvider>
  ) : (
    <FullScreenLoading />
  );
}

function PeerOverview() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { peer, user, peerGroups, openSSHDialog, update } = usePeer();
  const [ssh, setSsh] = useState(peer.ssh_enabled);
  const [name, setName] = useState(peer.name);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [loginExpiration, setLoginExpiration] = useState(
    peer.login_expiration_enabled,
  );
  const [inactivityExpiration, setInactivityExpiration] = useState(
    peer.inactivity_expiration_enabled,
  );
  const [selectedGroups, setSelectedGroups, { getAllGroupCalls }] =
    useGroupHelper({
      initial: peerGroups,
      peer,
    });

  /**
   * Detect if there are changes in the peer information, if there are changes, then enable the save button.
   */
  const { hasChanges, updateRef: updateHasChangedRef } = useHasChanges([
    name,
    ssh,
    selectedGroups,
    loginExpiration,
    inactivityExpiration,
  ]);

  const updatePeer = async () => {
    const updateRequest = update({
      name,
      ssh,
      loginExpiration,
      inactivityExpiration,
    });
    const groupCalls = getAllGroupCalls();
    const batchCall = groupCalls
      ? [...groupCalls, updateRequest]
      : [updateRequest];
    notify({
      title: name,
      description: "Peer was successfully saved",
      promise: Promise.all(batchCall).then(() => {
        mutate("/peers/" + peer.id);
        mutate("/groups");
        updateHasChangedRef([
          name,
          ssh,
          selectedGroups,
          loginExpiration,
          inactivityExpiration,
        ]);
      }),
      loadingMessage: "Saving the peer...",
    });
  };

  const { isUser, isOwnerOrAdmin } = useLoggedInUser();

  return (
    <PageContainer>
      <RoutesProvider>
        <div className={"p-default py-6 mb-4"}>
          <Breadcrumbs>
            <Breadcrumbs.Item
              href={"/peers"}
              label={"Peers"}
              icon={<PeerIcon size={13} />}
            />
            <Breadcrumbs.Item label={peer.ip} active />
          </Breadcrumbs>

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

                  {!isUser && (
                    <Modal
                      open={showEditNameModal}
                      onOpenChange={setShowEditNameModal}
                    >
                      <ModalTrigger>
                        <div
                          className={
                            "flex items-center gap-2 interactive-cell"
                          }
                        >
                          <PencilIcon size={16} />
                        </div>
                      </ModalTrigger>
                      <EditNameModal
                        onSuccess={(newName) => {
                          setName(newName);
                          setShowEditNameModal(false);
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
              <div className={"flex items-center gap-8"}>
                <Paragraph className={"flex items-center"}>
                  {user?.email}
                </Paragraph>
              </div>
            </div>
            <div className={"flex gap-4"}>
              <Button
                variant={"default"}
                className={"w-full"}
                onClick={() => router.push("/peers")}
              >
                Cancel
              </Button>
              <Button
                variant={"primary"}
                className={"w-full"}
                onClick={() => updatePeer()}
                disabled={!hasChanges || isUser}
              >
                Save Changes
              </Button>
            </div>
          </div>

          <div className={"flex gap-10 w-full mt-5 max-w-6xl"}>
            <PeerInformationCard peer={peer} />

            <div className={"flex flex-col gap-6 w-1/2 transition-all"}>
              <div>
                <PeerExpirationToggle
                  peer={peer}
                  value={loginExpiration}
                  icon={<TimerResetIcon size={16} />}
                  onChange={(state) => {
                    setLoginExpiration(state);
                    !state && setInactivityExpiration(false);
                  }}
                />
                {isOwnerOrAdmin && !!peer?.user_id && (
                  <div
                    className={cn(
                      "border border-gray-200 dark:border-nb-gray-900 border-t-0 rounded-b-md bg-gray-50 dark:bg-nb-gray-940 px-[1.28rem] pt-3 pb-5 flex flex-col gap-4 mx-[0.25rem]",
                      !loginExpiration
                        ? "opacity-50 pointer-events-none"
                        : "bg-subtle-emphasis",
                    )}
                  >
                    <PeerExpirationToggle
                      peer={peer}
                      variant={"blank"}
                      value={inactivityExpiration}
                      onChange={setInactivityExpiration}
                      title={"Require login after disconnect"}
                      description={
                        "Enable to require authentication after users disconnect from management for 10 minutes."
                      }
                      className={
                        !loginExpiration ? "opacity-40 pointer-events-none" : ""
                      }
                    />
                  </div>
                )}
              </div>

              <FullTooltip
                content={
                  <div
                    className={
                      "flex gap-2 items-center !text-nb-gray-300 text-xs"
                    }
                  >
                    <LockIcon size={14} />
                    <span>
                      {`You don't have the required permissions to update this
                          setting.`}
                    </span>
                  </div>
                }
                interactive={false}
                className={"w-full block"}
                disabled={!isUser}
              >
                <FancyToggleSwitch
                  value={ssh}
                  disabled={isUser}
                  onChange={(set) =>
                    !set
                      ? setSsh(false)
                      : openSSHDialog().then((confirm) => setSsh(confirm))
                  }
                  label={
                    <>
                      <TerminalSquare size={16} />
                      SSH Access
                    </>
                  }
                  helpText={
                    "Enable the SSH server on this peer to access the machine via an secure shell."
                  }
                />
              </FullTooltip>

              {!isUser && (
                <div>
                  <Label>Assigned Groups</Label>
                  <HelpText>
                    Use groups to control what this peer can access.
                  </HelpText>
                  <PeerGroupSelector
                    disabled={isUser}
                    onChange={setSelectedGroups}
                    values={selectedGroups}
                    hideAllGroup={true}
                    peer={peer}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {!isUser ? (
          <>
            <Separator />
            <PeerNetworkRoutesSection peer={peer} />
          </>
        ) : null}

        {peer?.id && (
          <>
            <Separator />
            <AccessiblePeersSection peerID={peer.id} />
          </>
        )}
      </RoutesProvider>
    </PageContainer>
  );
}

function PeerInformationCard({ peer }: Readonly<{ peer: Peer }>) {
  const { isLoading, getRegionByPeer } = useCountries();

  const countryText = useMemo(() => {
    return getRegionByPeer(peer);
  }, [getRegionByPeer, peer]);

  return (
    <Card>
      <Card.List>
        <Card.ListItem
          copy
          copyText={"NetBird IP-Address"}
          label={
            <>
              <MapPin size={16} />
              NetBird IP-Address
            </>
          }
          value={peer.ip}
        />

        <Card.ListItem
          copy
          copyText={"Public IP-Address"}
          label={
            <>
              <NetworkIcon size={16} />
              Public IP-Address
            </>
          }
          value={peer.connection_ip}
        />

        <Card.ListItem
          copy
          copyText={"DNS label"}
          label={
            <>
              <Globe size={16} />
              Domain Name
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
          copyText={"Hostname"}
          label={
            <>
              <MonitorSmartphoneIcon size={16} />
              Hostname
            </>
          }
          value={peer.hostname}
        />

        <Card.ListItem
          label={
            <>
              <FlagIcon size={16} />
              Region
            </>
          }
          tooltip={false}
          value={
            isEmpty(peer.country_code) ? (
              "Unknown"
            ) : (
              <>
                {isLoading ? (
                  <Skeleton width={140} />
                ) : (
                  <div className={"flex gap-2 items-center"}>
                    <div className={"border-0 border-nb-gray-800 rounded-full"}>
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
              Operating System
            </>
          }
          value={peer.os}
        />

        {peer.serial_number && peer.serial_number !== "" && (
          <Card.ListItem
            label={
              <>
                <Barcode size={16} />
                Serial Number
              </>
            }
            value={peer.serial_number}
          />
        )}

        <Card.ListItem
          label={
            <>
              <History size={16} />
              Last seen
            </>
          }
          value={
            peer.connected
              ? "just now"
              : dayjs(peer.last_seen).format("D MMMM, YYYY [at] h:mm A") +
                " (" +
                dayjs().to(peer.last_seen) +
                ")"
          }
        />

        <Card.ListItem
          label={
            <>
              <NetBirdIcon size={16} />
              Agent Version
            </>
          }
          value={peer.version}
        />

        <Card.ListItem
          label={
            <>
              <NetBirdIcon size={16} />
              UI Version
            </>
          }
          value={peer.ui_version?.replace("netbird-desktop-ui/", "")}
        />
      </Card.List>
    </Card>
  );
}

interface ModalProps {
  onSuccess: (name: string) => void;
  peer: Peer;
  initialName: string;
}
function EditNameModal({ onSuccess, peer, initialName }: Readonly<ModalProps>) {
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
          title={"Edit Peer Name"}
          description={"Set an easily identifiable name for your peer."}
          color={"blue"}
        />

        <div className={"p-default flex flex-col gap-4"}>
          <div>
            <Input
              placeholder={"e.g., AWS Servers"}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Card className={"w-full px-6 pt-5 pb-4"}>
            <Label>
              <Globe size={15} />
              Domain Name Preview
            </Label>
            <HelpText className={"mt-2"}>
              If the domain name already exists, we add an increment number
              suffix to it.
            </HelpText>
            <div className={"text-highlight text-sm break-all whitespace-normal"}>
              {domainNamePreview}
            </div>
          </Card>
        </div>

        <ModalFooter className={"items-center"} separator={false}>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"} className={"w-full"}>
                Cancel
              </Button>
            </ModalClose>

            <Button
              variant={"primary"}
              className={"w-full"}
              onClick={() => onSuccess(name)}
              disabled={isDisabled}
              type={"submit"}
            >
              Save
            </Button>
          </div>
        </ModalFooter>
      </form>
    </ModalContent>
  );
}
