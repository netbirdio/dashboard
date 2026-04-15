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
import { getOperatingSystem } from "@hooks/useOperatingSystem";
import useFetchApi, { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { uniqBy } from "lodash";
import {
  ArrowDownWideNarrow,
  DownloadIcon,
  ExternalLinkIcon,
  FolderGit2,
  Loader2,
  MonitorSmartphoneIcon,
  PlusCircle,
  Power,
  Settings2,
  Share2Icon,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useDialog } from "@/contexts/DialogProvider";
import { Network, NetworkRouter } from "@/interfaces/Network";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import { Peer } from "@/interfaces/Peer";
import { SetupKey } from "@/interfaces/SetupKey";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { RoutingPeerMasqueradeSwitch } from "@/modules/networks/routing-peers/RoutingPeerMasqueradeSwitch";
import { useI18n } from "@/i18n/I18nProvider";
import SetupModal from "@/modules/setup-netbird-modal/SetupModal";

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
  const { t } = useI18n();
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
    router ? router.masquerade : true,
  );
  const [enabled, setEnabled] = useState<boolean>(
    router ? router.enabled : true,
  );

  const [metric, setMetric] = useState(
    router?.metric ? router.metric.toString() : "9999",
  );

  const isNonLinuxRoutingPeer = useMemo(() => {
    if (!routingPeer) return false;
    return getOperatingSystem(routingPeer.os) != OperatingSystem.LINUX;
  }, [routingPeer]);

  useEffect(() => {
    if (isNonLinuxRoutingPeer) setMasquerade(true);
  }, [isNonLinuxRoutingPeer]);

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
      title: t("routeModal.routingPeer"),
      description: t("networkRoutingPeers.addedSuccessfully"),
      loadingMessage: t("networkRoutingPeers.adding"),
      promise: create({
        peer: isRoutingPeer ? routingPeer?.id : undefined,
        peer_groups: !isRoutingPeer
          ? createdGroups.map((g) => g.id)
          : undefined,
        metric: parseInt(metric),
        enabled,
        masquerade: isRoutingPeer && isNonLinuxRoutingPeer ? true : masquerade,
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
      title: t("routeModal.routingPeer"),
      description: t("networkRoutingPeers.addedSuccessfully"),
      loadingMessage: t("networkRoutingPeers.adding"),
      promise: update({
        peer: isRoutingPeer ? routingPeer?.id : undefined,
        peer_groups: !isRoutingPeer
          ? createdGroups.map((g) => g.id)
          : undefined,
        metric: parseInt(metric),
        enabled,
        masquerade: isRoutingPeer && isNonLinuxRoutingPeer ? true : masquerade,
      }).then((r) => {
        onUpdated?.(r);
      }),
    });
  };

  const canContinue = routingPeer !== undefined || routingPeerGroups.length > 0;

  return (
    <ModalContent maxWidthClass={"max-w-xl"}>
      <ModalHeader
        icon={<Share2Icon size={16} />}
        title={router ? t("networkRoutingPeers.updateTitle") : t("networkRoutingPeers.addTitle")}
        description={t("networkRoutingPeers.description", { name: network.name })}
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
            {t("networkRoutingPeers.tabs.routingPeers")}
          </TabsTrigger>

          <TabsTrigger value={"settings"} className={"ml-auto"}>
            <Settings2
              size={16}
              className={
                "text-nb-gray-500 group-data-[state=active]/trigger:text-netbird transition-all"
              }
            />
            {t("networkRoutingPeers.tabs.advanced")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value={"router"} className={"pb-6"}>
          <div className={"flex flex-col gap-4 px-8"}>
            <div className={"relative "}>
              <SegmentedTabs
                value={type}
                onChange={(state) => {
                  setType(state);
                  setRoutingPeer(undefined);
                  setRoutingPeerGroups([]);
                }}
              >
                <SegmentedTabs.List>
                  <SegmentedTabs.Trigger value={"peer"}>
                    <MonitorSmartphoneIcon size={16} />
                    {t("networkRoutingPeers.segment.peer")}
                  </SegmentedTabs.Trigger>

                  <SegmentedTabs.Trigger value={"group"}>
                    <FolderGit2 size={16} />
                    {t("networkRoutingPeers.segment.group")}
                  </SegmentedTabs.Trigger>
                </SegmentedTabs.List>
                <SegmentedTabs.Content value={"peer"}>
                  <div>
                    <HelpText>
                      {t("networkRoutingPeers.segment.peerHelp")}
                    </HelpText>
                    <PeerSelector
                      onChange={setRoutingPeer}
                      value={routingPeer}
                    />
                  </div>
                </SegmentedTabs.Content>
                <SegmentedTabs.Content value={"group"}>
                  <div>
                    <HelpText>
                      {t("networkRoutingPeers.segment.groupHelp")}
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

            <div className={cn("flex justify-between items-center mt-3")}>
              <div>
                <Label>{t("networkRoutingPeers.dontHave")}</Label>
                <HelpText className={""}>
                  {t("networkRoutingPeers.dontHaveHelp")}
                </HelpText>
              </div>
              <InstallNetBirdWithSetupKeyButton
                name={t("networkRoutingPeers.setupKeyName", {
                  name: network.name,
                })}
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
                  {t("networkRoutingPeers.enable")}
                </>
              }
              helpText={
                t("networkRoutingPeers.enableHelp")
              }
            />

            <RoutingPeerMasqueradeSwitch
              value={masquerade}
              onChange={setMasquerade}
              disabled={isNonLinuxRoutingPeer}
              routingPeerGroupId={routingPeerGroups?.[0]?.id}
            />

            <div className={cn("flex justify-between")}>
              <div>
                <Label>{t("networkRoutingPeers.metric")}</Label>
                <HelpText className={"max-w-[200px]"}>
                  {t("networkRoutingPeers.metricHelp")}
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
            {t("common.learnMorePrefix")}{" "}
            <InlineLink
              href={"https://docs.netbird.io/how-to/networks#routing-peers"}
              target={"_blank"}
            >
              {t("networkRoutingPeers.tabs.routingPeers")}
              <ExternalLinkIcon size={12} />
            </InlineLink>
          </Paragraph>
        </div>
        <div className={"flex gap-3 w-full justify-end"}>
          {tab == "router" && (
            <>
              <ModalClose asChild={true}>
                <Button variant={"secondary"}>{t("actions.cancel")}</Button>
              </ModalClose>
              <Button
                variant={"primary"}
                onClick={() => setTab("settings")}
                disabled={!canContinue}
              >
                {t("actions.continue")}
              </Button>
            </>
          )}
          {tab == "settings" && (
            <>
              <Button variant={"secondary"} onClick={() => setTab("router")}>
                {t("actions.back")}
              </Button>

              <Button
                variant={"primary"}
                disabled={
                  routingPeer == undefined && routingPeerGroups.length <= 0
                }
                onClick={router ? updateRouter : addRouter}
              >
                {router ? (
                  <>{t("actions.saveChanges")}</>
                ) : (
                  <>
                    <PlusCircle size={16} />
                    {t("networkRoutingPeers.addTitle")}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </ModalFooter>
    </ModalContent>
  );
}

type InstallNetBirdWithSetupKeyButtonProps = {
  name?: string;
};

const InstallNetBirdWithSetupKeyButton = ({
  name,
}: InstallNetBirdWithSetupKeyButtonProps) => {
  const { t } = useI18n();
  const setupKeyRequest = useApiCall<SetupKey>("/setup-keys", true);
  const { mutate } = useSWRConfig();
  const { confirm } = useDialog();

  const [installModal, setInstallModal] = useState(false);
  const [setupKey, setSetupKey] = useState<SetupKey>();
  const [isLoading, setIsLoading] = useState(false);

  const createSetupKey = async () => {
    const choice = await confirm({
      title: t("networkRoutingPeers.createSetupKeyTitle"),
      description: t("networkRoutingPeers.createSetupKeyDescription"),
      confirmText: t("actions.continue"),
      cancelText: t("actions.cancel"),
      type: "default",
    });
    if (!choice) return;

    const loadingTimeout = setTimeout(() => setIsLoading(true), 1000);

    await setupKeyRequest
      .post({
        name,
        type: "one-off",
        expires_in: 24 * 60 * 60, // 1 day expiration
        revoked: false,
        auto_groups: [],
        usage_limit: 1,
        ephemeral: false,
        allow_extra_dns_labels: false,
      })
      .then((setupKey) => {
        setInstallModal(true);
        setSetupKey(setupKey);
        mutate("/setup-keys");
      })
      .finally(() => {
        setIsLoading(false);
        clearTimeout(loadingTimeout);
      });
  };

  return (
    <>
      <Button
        variant={"secondary"}
        size={"xs"}
        className={"ml-8"}
        onClick={createSetupKey}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 size={14} className={"animate-spin delay-1000"} />
        ) : (
          <DownloadIcon size={14} />
        )}
        {t("setupModal.installNetBird")}
      </Button>
      {setupKey && (
        <Modal
          open={installModal}
          onOpenChange={setInstallModal}
          key={setupKey.key}
        >
          <SetupModal
            showClose={true}
            setupKey={setupKey.key}
            showOnlyRoutingPeerOS={true}
          />
        </Modal>
      )}
    </>
  );
};
