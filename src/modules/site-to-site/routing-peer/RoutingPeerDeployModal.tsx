import Button from "@components/Button";
import { Callout } from "@components/Callout";
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
import { SelectDropdown } from "@components/select/SelectDropdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { ExternalLinkIcon, ServerIcon, SquareTerminalIcon } from "lucide-react";
import React, { useCallback, useState } from "react";
import { useSWRConfig } from "swr";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Network } from "@/interfaces/Network";
import {
  INSTALL_METHODS,
  InstallMethod,
  ROUTING_PEERS_DOCS_LINK,
} from "@/modules/site-to-site/routing-peer/routingPeerDeploy";
import {
  INSTALL_METHOD_OPTIONS,
  RoutingPeerInstall,
} from "@/modules/site-to-site/routing-peer/RoutingPeerInstall";
import { useRoutingPeerSetupKey } from "@/modules/site-to-site/routing-peer/useRoutingPeerSetupKey";
import {
  routingPeerHostname,
  validRoutingPeerHostname,
} from "@/modules/site-to-site/siteToSite";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Networks that need a routing peer; the first one is selected.
  networks: Network[];
  onFinish?: () => void;
};

/**
 * Adds a routing peer to a network on infra the user owns, in the steps of
 * the proxy cluster setup: a name and a deployment method, then the command.
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
  const [method, setMethod] = useState<InstallMethod>("linux");
  const setup = useRoutingPeerSetupKey(network);

  // A setup key is made for one network, so switching starts over.
  const selectNetwork = (id: string) => {
    const next = networks.find((n) => n.id === id);
    setNetworkId(id);
    setHostname(next ? routingPeerHostname(next) : "");
    setup.reset();
  };

  const hostnameError = validRoutingPeerHostname(hostname)
    ? ""
    : "Use letters, numbers and dashes, e.g., router-berlin";
  const canContinue = !!network && !!hostname.trim() && !hostnameError;
  const canCreate =
    !!permission.networks.update &&
    !!permission.groups?.create &&
    !!permission.setup_keys?.create;

  const goToInstall = useCallback(() => {
    if (!canContinue) return;
    setTab("install");
    if (!setup.setupKey && !setup.isPreparing)
      setup.prepare().catch(() => setTab("peer"));
  }, [canContinue, setup]);

  const finish = () => {
    onOpenChange(false);
    mutate("/networks");
    mutate("/networks/site-to-site");
    onFinish?.();
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent maxWidthClass={"relative max-w-[600px]"} showClose={true}>
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
            <TabsTrigger
              value={"install"}
              disabled={!canContinue || !canCreate}
            >
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
                <HelpText>{INSTALL_METHODS[method].description}</HelpText>
                <SelectDropdown
                  value={method}
                  onChange={(v) => setMethod(v as InstallMethod)}
                  options={INSTALL_METHOD_OPTIONS}
                />
              </div>
              <Callout variant={"info"}>
                In order to route traffic, please make sure your machine meets
                the following requirements:
                <ul className={"list-disc pl-4 mt-2 flex flex-col gap-1"}>
                  <li>
                    <span
                      className={"text-sky-900 dark:text-white font-medium"}
                    >
                      Inside the network
                    </span>{" "}
                    and able to reach its IP ranges
                  </li>
                  <li>
                    <span
                      className={"text-sky-900 dark:text-white font-medium"}
                    >
                      Linux
                    </span>
                    {method === "linux" ? "" : " with Docker"} installed and
                    running
                  </li>
                  <li>
                    <span
                      className={"text-sky-900 dark:text-white font-medium"}
                    >
                      Outbound internet access
                    </span>{" "}
                    to reach NetBird
                  </li>
                </ul>
              </Callout>
            </div>
          </TabsContent>

          <TabsContent value={"install"} className={"pb-8"}>
            <div className={"px-8"}>
              <RoutingPeerInstall
                method={method}
                hostname={hostname}
                setupKey={setup.setupKey}
                isPreparing={setup.isPreparing}
                group={setup.group}
                knownPeerIds={setup.knownPeerIds}
              />
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
