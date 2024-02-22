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
import { IconCloudLock, IconInfoCircle } from "@tabler/icons-react";
import useFetchApi from "@utils/api";
import dayjs from "dayjs";
import { trim } from "lodash";
import {
  Cpu,
  Globe,
  History,
  MapPin,
  MonitorSmartphoneIcon,
  PencilIcon,
  TerminalSquare,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toASCII } from "punycode";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import CircleIcon from "@/assets/icons/CircleIcon";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";
import PeerIcon from "@/assets/icons/PeerIcon";
import PeerProvider, { usePeer } from "@/contexts/PeerProvider";
import RoutesProvider from "@/contexts/RoutesProvider";
import { useHasChanges } from "@/hooks/useHasChanges";
import { getOperatingSystem } from "@/hooks/useOperatingSystem";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import type { Peer } from "@/interfaces/Peer";
import PageContainer from "@/layouts/PageContainer";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import AddRouteDropdownButton from "@/modules/peer/AddRouteDropdownButton";
import PeerRoutesTable from "@/modules/peer/PeerRoutesTable";

export default function PeerPage() {
  const queryParameter = useSearchParams();
  const peerId = queryParameter.get("id");
  const { data: peer } = useFetchApi<Peer>("/peers/" + peerId);
  return peer ? (
    <PeerProvider peer={peer}>
      <PeerOverview />
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
  const [selectedGroups, setSelectedGroups, { getAllGroupCalls }] =
    useGroupHelper({
      initial: peerGroups,
      peer,
    });

  /**
   * Check the operating system of the peer, if it is linux, then show the routes table, otherwise hide it.
   */
  const isLinux = useMemo(() => {
    const operatingSystem = getOperatingSystem(peer.os);
    return operatingSystem == OperatingSystem.LINUX;
  }, [peer.os]);

  /**
   * Detect if there are changes in the peer information, if there are changes, then enable the save button.
   */
  const { hasChanges, updateRef: updateHasChangedRef } = useHasChanges([
    name,
    ssh,
    selectedGroups,
    loginExpiration,
  ]);

  const updatePeer = async () => {
    const updateRequest = update(name, ssh, loginExpiration);
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
        updateHasChangedRef([name, ssh, selectedGroups, loginExpiration]);
      }),
      loadingMessage: "Saving the peer...",
    });
  };

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
                    className={"mb-[3px]"}
                  />
                  <TextWithTooltip text={name} maxChars={30} />

                  <Modal
                    open={showEditNameModal}
                    onOpenChange={setShowEditNameModal}
                  >
                    <ModalTrigger>
                      <div
                        className={
                          "flex items-center gap-2 dark:text-neutral-300 text-neutral-500 hover:text-neutral-100 transition-all hover:bg-nb-gray-800/60 py-2 px-3 rounded-md cursor-pointer"
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
                disabled={!hasChanges}
              >
                Save Changes
              </Button>
            </div>
          </div>

          <div className={"flex gap-10 w-full mt-5 max-w-6xl"}>
            <PeerInformationCard peer={peer} />

            <div className={"flex flex-col gap-6 w-1/2"}>
              <FullTooltip
                content={
                  <div
                    className={
                      "flex gap-2 items-center !text-nb-gray-300 text-xs"
                    }
                  >
                    <IconInfoCircle size={14} />
                    <span>
                      Login expiration is disabled for all peers added with an
                      setup-key.
                    </span>
                  </div>
                }
                className={"w-full block"}
                disabled={!!peer.user_id}
              >
                <FancyToggleSwitch
                  disabled={!peer.user_id}
                  value={loginExpiration}
                  onChange={setLoginExpiration}
                  label={
                    <>
                      <IconCloudLock size={16} />
                      Login Expiration
                    </>
                  }
                  helpText={
                    "Enable to require SSO login peers to re-authenticate when their login expires."
                  }
                />
              </FullTooltip>
              <FancyToggleSwitch
                value={ssh}
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
              <div>
                <Label>Assigned Groups</Label>
                <HelpText>
                  Use groups to control what this peer can access.
                </HelpText>
                <PeerGroupSelector
                  onChange={setSelectedGroups}
                  values={selectedGroups}
                  peer={peer}
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {isLinux ? (
          <div className={"px-8 py-6"}>
            <div className={"max-w-6xl"}>
              <div className={"flex justify-between items-center"}>
                <div>
                  <h2>Network Routes</h2>
                  <Paragraph>
                    Access other networks without installing NetBird on every
                    resource.
                  </Paragraph>
                </div>
                <div className={"inline-flex gap-4 justify-end"}>
                  <div>
                    <AddRouteDropdownButton />
                  </div>
                </div>
              </div>
              <PeerRoutesTable peer={peer} />
            </div>
          </div>
        ) : null}
      </RoutesProvider>
    </PageContainer>
  );
}

function PeerInformationCard({ peer }: { peer: Peer }) {
  return (
    <Card>
      <Card.List>
        <Card.ListItem
          label={
            <>
              <MapPin size={16} />
              NetBird IP-Address
            </>
          }
          value={peer.ip}
        />

        <Card.ListItem
          label={
            <>
              <Globe size={16} />
              Domain Name
            </>
          }
          value={peer.dns_label}
        />
        <Card.ListItem
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
              <Cpu size={16} />
              Operating System
            </>
          }
          value={peer.os}
        />
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
function EditNameModal({ onSuccess, peer, initialName }: ModalProps) {
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
            <div className={"text-netbird text-sm break-all whitespace-normal"}>
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
