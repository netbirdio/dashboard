import Button from "@components/Button";
import { Callout } from "@components/Callout";
import Code from "@components/Code";
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
import { SelectDropdown } from "@components/select/SelectDropdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { renderHighlightedCommand } from "@components/ui/HighlightedCommand";
import useFetchApi, { useApiCall } from "@utils/api";
import { cn, validator } from "@utils/helpers";
import {
  CheckCircle2,
  ExternalLinkIcon,
  Loader2,
  ServerIcon,
  SquareTerminalIcon,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import DockerIcon from "@/assets/icons/DockerIcon";
import { IconProps } from "@/assets/icons/IconProperties";
import { LinuxIcon } from "@/assets/icons/LinuxIcon";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group, GroupPeer } from "@/interfaces/Group";
import { Network, NetworkRouter } from "@/interfaces/Network";
import { SetupKey } from "@/interfaces/SetupKey";
import {
  routingPeerGroupName,
  routingPeerHostname,
} from "@/modules/site-to-site/siteToSite";
import { GRPC_API_ORIGIN } from "@/utils/netbird";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Networks that need a routing peer; the first one is selected.
  networks: Network[];
  onFinish?: () => void;
};

type DeployMethod = "linux" | "docker" | "compose";

const ROUTING_PEERS_DOCS_LINK =
  "https://docs.netbird.io/manage/networks#routing-peers";

// DockerIcon carries no fill of its own, so the brand blue is applied here.
const DockerBrandIcon = (props: Readonly<IconProps>) => (
  <DockerIcon {...props} className={"fill-[#2496ED]"} />
);

// LinuxIcon is filled black by default, which disappears on the dark menu.
const LinuxBrandIcon = (props: Readonly<IconProps>) => (
  <LinuxIcon {...props} className={"fill-nb-gray-200 shrink-0"} />
);

const SETUP_KEY_PLACEHOLDER = "<SETUP_KEY>";

const commandFor = (
  method: DeployMethod,
  setupKey: string,
  hostname: string,
  managementUrl?: string,
) => {
  if (method === "linux") {
    const management = managementUrl
      ? ` \\\n --management-url ${managementUrl}`
      : "";
    return `curl -fsSL https://pkgs.netbird.io/install.sh | sh
netbird up --setup-key ${setupKey} \\
 --hostname ${hostname}${management}`;
  }

  if (method === "docker") {
    const management = managementUrl
      ? `\n -e NB_MANAGEMENT_URL=${managementUrl} \\`
      : "";
    return `docker run -d --restart=unless-stopped \\
 --network host \\
 --cap-add=NET_ADMIN --cap-add=SYS_ADMIN --cap-add=SYS_RESOURCE \\
 -e NB_SETUP_KEY=${setupKey} \\
 -e NB_HOSTNAME=${hostname} \\${management}
 -v netbird-client:/var/lib/netbird \\
 netbirdio/netbird:latest`;
  }

  const management = managementUrl
    ? `\n      - NB_MANAGEMENT_URL=${managementUrl}`
    : "";
  return `services:
  netbird-client:
    image: netbirdio/netbird:latest
    hostname: ${hostname}
    restart: unless-stopped
    network_mode: host
    cap_add:
      - NET_ADMIN
      - SYS_ADMIN
      - SYS_RESOURCE
    devices:
      - /dev/net/tun
    environment:
      - NB_SETUP_KEY=${setupKey}${management}
    volumes:
      - netbird-client:/var/lib/netbird
volumes:
  netbird-client:`;
};

const DEPLOYMENTS: Record<
  DeployMethod,
  { label: string; title: string; description: string }
> = {
  linux: {
    label: "Linux",
    title: "Install on Linux",
    description: "Run on a Linux machine in the network to install NetBird.",
  },
  docker: {
    label: "Docker",
    title: "Run with Docker",
    description: "Run on a machine in the network to start the routing peer.",
  },
  compose: {
    label: "Docker Compose",
    title: "Run with Docker Compose",
    description: "Run on a machine in the network to start the routing peer.",
  },
};

const groupPeerIds = (group?: Group) =>
  ((group?.peers ?? []) as (GroupPeer | string)[]).map((p) =>
    typeof p === "string" ? p : p.id,
  );

/**
 * Adds a routing peer to a network on infra the user owns. The routing peer
 * joins with a one-off setup key that puts it in the network's routing peer
 * group, and the network routes through that group, so it starts routing as
 * soon as it registers.
 */
export const RoutingPeerDeployModal = ({
  open,
  onOpenChange,
  networks,
  onFinish,
}: Props) => {
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const [tab, setTab] = useState("peer");
  const [networkId, setNetworkId] = useState(networks[0]?.id ?? "");
  const network = networks.find((n) => n.id === networkId) ?? networks[0];
  const [hostname, setHostname] = useState(
    network ? routingPeerHostname(network) : "",
  );
  const [deployMethod, setDeployMethod] = useState<DeployMethod>("linux");
  const [setupKey, setSetupKey] = useState("");
  const [group, setGroup] = useState<Group>();
  const [knownPeerIds, setKnownPeerIds] = useState<string[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);

  const groupRequest = useApiCall<Group>("/groups", true);
  const routerRequest = useApiCall<NetworkRouter>("/networks", true);
  const setupKeyRequest = useApiCall<SetupKey>("/setup-keys", true);
  const { data: groups } = useFetchApi<Group[]>("/groups");

  // A setup key is made for one network, so switching starts over.
  const selectNetwork = (id: string) => {
    const next = networks.find((n) => n.id === id);
    setNetworkId(id);
    setHostname(next ? routingPeerHostname(next) : "");
    setSetupKey("");
    setGroup(undefined);
  };

  const hostnameError = useMemo(() => {
    if (!hostname) return "";
    return validator.isValidDomain(hostname, {
      allowWildcard: false,
      allowOnlyTld: true,
    })
      ? ""
      : "Use letters, numbers and dashes, e.g., router-berlin";
  }, [hostname]);
  const canContinue = !!network && !!hostname.trim() && !hostnameError;

  const managementUrl = GRPC_API_ORIGIN || undefined;
  const deployment = DEPLOYMENTS[deployMethod];
  const keyValue = setupKey || SETUP_KEY_PLACEHOLDER;
  const command = commandFor(deployMethod, keyValue, hostname, managementUrl);

  // The group and router are reused when the network already routes through
  // its routing peer group, so running the setup twice adds nothing twice.
  const prepare = useCallback(async () => {
    if (!network) return;
    setIsPreparing(true);
    const promise = (async () => {
      const groupName = routingPeerGroupName(network);
      const routingGroup =
        groups?.find((g) => g.name === groupName) ??
        (await groupRequest.post({ name: groupName }));

      const routers = await routerRequest.get(`/${network.id}/routers`);
      const routesThroughGroup = (routers as unknown as NetworkRouter[])?.some(
        (r) => r.peer_groups?.includes(routingGroup.id as string),
      );
      if (!routesThroughGroup) {
        await routerRequest.post(
          {
            peer_groups: [routingGroup.id],
            metric: 9999,
            masquerade: true,
            enabled: true,
          },
          `/${network.id}/routers`,
        );
      }

      const key = await setupKeyRequest.post({
        name: `Routing peer for ${network.name}`,
        type: "one-off",
        expires_in: 24 * 60 * 60,
        revoked: false,
        auto_groups: [routingGroup.id],
        usage_limit: 1,
        ephemeral: false,
        allow_extra_dns_labels: false,
      });

      setGroup(routingGroup);
      setKnownPeerIds(groupPeerIds(routingGroup));
      setSetupKey(key.key);
      mutate("/setup-keys");
      mutate("/groups");
      mutate("/networks");
      mutate(`/networks/${network.id}/routers`);
    })().finally(() => setIsPreparing(false));

    notify({
      title: "Routing Peer",
      description: "Failed to prepare the routing peer setup key",
      promise,
      loadingMessage: "Preparing setup key...",
      showOnlyError: true,
      preventSuccessToast: true,
    });
    return promise;
  }, [network, groups, groupRequest, routerRequest, setupKeyRequest, mutate]);

  const goToInstall = useCallback(() => {
    if (!canContinue) return;
    setTab("install");
    if (!setupKey && !isPreparing) prepare().catch(() => setTab("peer"));
  }, [canContinue, setupKey, isPreparing, prepare]);

  const finish = () => {
    onOpenChange(false);
    mutate("/networks");
    mutate("/networks/site-to-site");
    onFinish?.();
  };

  const canCreate =
    !!permission.networks.update &&
    !!permission.groups?.create &&
    !!permission.setup_keys?.create;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        maxWidthClass={"relative max-w-[600px]"}
        showClose={true}
      >
        <ModalHeader
          icon={<NetworkRoutesIcon className={"fill-netbird"} />}
          title={"Deploy Routing Peer"}
          description={
            network
              ? `Add a routing peer to ${network.name} on infra you own`
              : "Add a routing peer on infra you own"
          }
          color={"netbird"}
        />

        <Tabs
          value={tab}
          onValueChange={(v) => (v === "install" ? goToInstall() : setTab(v))}
        >
          <TabsList justify={"start"} className={"px-8"}>
            <TabsTrigger value={"peer"}>
              <ServerIcon size={14} />
              Routing Peer
            </TabsTrigger>
            <TabsTrigger value={"install"} disabled={!canContinue || !canCreate}>
              <SquareTerminalIcon size={14} />
              Run the Routing Peer
            </TabsTrigger>
          </TabsList>

          <TabsContent value={"peer"} className={"pb-8"}>
            <div className={"px-8 flex flex-col gap-6"}>
              {networks.length > 1 && (
                <div>
                  <Label>Network</Label>
                  <HelpText>
                    These networks have no routing peer yet. Deploy one for
                    each.
                  </HelpText>
                  <SelectDropdown
                    value={networkId}
                    onChange={selectNetwork}
                    options={networks.map((n) => ({
                      value: n.id,
                      label: n.name,
                    }))}
                  />
                </div>
              )}
              <div>
                <Label>Name</Label>
                <HelpText>
                  The name the routing peer registers with in NetBird.
                </HelpText>
                <Input
                  autoFocus={true}
                  placeholder={"e.g., router-berlin"}
                  value={hostname}
                  error={hostnameError}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setHostname(e.target.value)
                  }
                />
              </div>
              <div>
                <Label>Deployment Method</Label>
                <HelpText>{deployment.description}</HelpText>
                <SelectDropdown
                  value={deployMethod}
                  onChange={(v) => setDeployMethod(v as DeployMethod)}
                  options={[
                    { value: "linux", label: "Linux", icon: LinuxBrandIcon },
                    { value: "docker", label: "Docker", icon: DockerBrandIcon },
                    {
                      value: "compose",
                      label: "Docker Compose",
                      icon: DockerBrandIcon,
                    },
                  ]}
                />
              </div>
              <Callout variant={"info"}>
                In order to route traffic, please make sure your machine meets
                the following requirements:
                <ul className={"list-disc pl-4 mt-2 flex flex-col gap-1"}>
                  <li>
                    <span className={"text-white font-medium"}>
                      Inside the network
                    </span>{" "}
                    and able to reach its IP ranges
                  </li>
                  <li>
                    <span className={"text-white font-medium"}>Linux</span>
                    {deployMethod === "linux" ? "" : " with Docker"} installed
                    and running
                  </li>
                  <li>
                    <span className={"text-white font-medium"}>
                      Outbound internet access
                    </span>{" "}
                    to reach NetBird
                  </li>
                </ul>
              </Callout>
            </div>
          </TabsContent>

          <TabsContent value={"install"} className={"pb-8"}>
            <div className={"px-8 flex flex-col gap-4"}>
              <div>
                <Label>{deployment.title}</Label>
                <HelpText className={"mb-0"}>{deployment.description}</HelpText>
              </div>
              <Code
                key={deployMethod}
                codeToCopy={command}
                className={cn(
                  "overflow-hidden",
                  isPreparing && "!border-nb-gray-930",
                )}
                showCopyIcon={!isPreparing}
              >
                {isPreparing && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-nb-gray-100 bg-nb-gray-950/90">
                    <Loader2 size={16} className="animate-spin" />
                    Generating setup key...
                  </div>
                )}
                {renderHighlightedCommand(command, [
                  keyValue,
                  hostname,
                  managementUrl ?? "",
                ])}
              </Code>
              <HelpText className={"mb-0"}>
                The setup key works once and expires in 24 hours.
              </HelpText>
              {group && (
                <RegistrationCheck
                  groupId={group.id as string}
                  knownPeerIds={knownPeerIds}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>

        <ModalFooter className={"items-center"}>
          <div className={"w-full"}>
            <Paragraph className={"text-sm mt-auto"}>
              Learn more about
              <InlineLink href={ROUTING_PEERS_DOCS_LINK} target={"_blank"}>
                Routing Peers
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </Paragraph>
          </div>
          <div className={"flex gap-3 w-full justify-end"}>
            {tab === "peer" ? (
              <>
                <ModalClose asChild={true}>
                  <Button variant={"secondary"}>Cancel</Button>
                </ModalClose>
                <Button
                  variant={"primary"}
                  onClick={goToInstall}
                  disabled={!canContinue || !canCreate}
                >
                  Continue
                </Button>
              </>
            ) : (
              <>
                <Button variant={"secondary"} onClick={() => setTab("peer")}>
                  Back
                </Button>
                <Button variant={"primary"} onClick={finish}>
                  Finish Setup
                </Button>
              </>
            )}
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

// RegistrationCheck polls the routing peer group until a peer that was not in
// it when the setup key was made shows up.
const RegistrationCheck = ({
  groupId,
  knownPeerIds,
}: {
  groupId: string;
  knownPeerIds: string[];
}) => {
  const newPeer = useCallback(
    (group?: Group) =>
      ((group?.peers ?? []) as (GroupPeer | string)[]).find(
        (p) => !knownPeerIds.includes(typeof p === "string" ? p : p.id),
      ),
    [knownPeerIds],
  );
  const { data: group } = useFetchApi<Group>(
    `/groups/${groupId}`,
    true,
    false,
    true,
    { refreshInterval: (latest?: Group) => (newPeer(latest) ? 0 : 3000) },
  );
  const peer = newPeer(group);
  const registeredPeer = typeof peer === "string" ? peer : peer?.name;

  return (
    <div className={"flex items-center gap-2 text-sm"}>
      {registeredPeer ? (
        <>
          <CheckCircle2 size={16} className={"text-green-500 shrink-0"} />
          <span className={"text-nb-gray-100"}>
            Routing peer {registeredPeer} registered with NetBird.
          </span>
        </>
      ) : (
        <>
          <Loader2 size={16} className={"animate-spin shrink-0"} />
          <span className={"text-nb-gray-300"}>
            Waiting for the routing peer to register with NetBird...
          </span>
        </>
      )}
    </div>
  );
};
