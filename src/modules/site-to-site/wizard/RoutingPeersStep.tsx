import Badge from "@components/Badge";
import Button from "@components/Button";
import { Callout } from "@components/Callout";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import { PeerSelector } from "@components/PeerSelector";
import { SelectDropdown } from "@components/select/SelectDropdown";
import { useApiCall } from "@utils/api";
import { KeyRoundIcon, PlusCircle, ServerIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Network, NetworkRouter } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { NetworkInformationSquare } from "@/modules/networks/misc/NetworkInformationSquare";
import {
  INSTALL_METHODS,
  InstallMethod,
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

type Method = "existing" | InstallMethod;

const METHOD_OPTIONS = [
  { value: "existing", label: "Existing peer", icon: ServerIcon },
  ...INSTALL_METHOD_OPTIONS,
];

type Props = {
  networks: Network[];
  rangeOf: (network: Network) => string | undefined;
};

/** A routing peer setup for each network that has none. */
export const RoutingPeersStep = ({ networks, rangeOf }: Props) => (
  <div className={"flex flex-col gap-4"}>
    {networks.map((network) => (
      <RoutingPeerCard
        key={network.id}
        network={network}
        range={rangeOf(network)}
      />
    ))}
  </div>
);

const RoutingPeerCard = ({
  network,
  range,
}: {
  network: Network;
  range?: string;
}) => {
  const { mutate } = useSWRConfig();
  const { permission } = usePermissions();
  const routed = (network.routing_peers_count ?? 0) > 0;
  const [method, setMethod] = useState<Method>("existing");
  const [peer, setPeer] = useState<Peer>();
  const [hostname, setHostname] = useState(routingPeerHostname(network));
  const [isAdding, setIsAdding] = useState(false);
  const setup = useRoutingPeerSetupKey(network);
  const routerRequest = useApiCall<NetworkRouter>("/networks", true);

  const hostnameError = validRoutingPeerHostname(hostname)
    ? ""
    : "Use letters, numbers and dashes, e.g., router-berlin";

  const addExistingPeer = () => {
    if (!peer?.id) return;
    setIsAdding(true);
    const promise = routerRequest
      .post(
        { peer: peer.id, metric: 9999, masquerade: true, enabled: true },
        `/${network.id}/routers`,
      )
      .then(() => {
        mutate("/networks");
        mutate("/networks/routers");
        mutate(`/networks/${network.id}/routers`);
      })
      .finally(() => setIsAdding(false));
    notify({
      title: network.name,
      description: `${peer.name} now routes for this network.`,
      loadingMessage: "Adding routing peer...",
      promise,
    });
  };

  return (
    <section
      className={
        "flex flex-col gap-5 rounded-lg border border-nb-gray-800 bg-nb-gray-900/70 p-5"
      }
      aria-label={network.name}
    >
      <div className={"flex items-center justify-between gap-4"}>
        <NetworkInformationSquare
          name={network.name}
          active={routed}
          subtitle={
            <span className={"text-xs text-nb-gray-400 text-left"}>
              {routed ? "Routing peer added" : "No routing peer yet"}
            </span>
          }
        />
        <Badge
          variant={routed ? "green" : "yellow"}
          useHover={false}
          className={"shrink-0"}
        >
          {routed ? "Routing peer added" : "No routing peer"}
        </Badge>
      </div>

      {!routed && (
        <>
          <div>
            <Label>Deployment Method</Label>
            <HelpText>
              {method === "existing"
                ? `Use a machine in ${network.name} that already runs NetBird.`
                : INSTALL_METHODS[method].description}
            </HelpText>
            <SelectDropdown
              value={method}
              onChange={(v) => {
                setMethod(v as Method);
                setup.reset();
              }}
              options={METHOD_OPTIONS}
            />
          </div>

          {method === "existing" ? (
            <>
              <div>
                <Label>Peer</Label>
                <HelpText>
                  Pick a peer inside {network.name}
                  {range ? ` that can reach ${range}` : ""}.
                </HelpText>
                <PeerSelector value={peer} onChange={setPeer} />
              </div>
              <Button
                variant={"secondary"}
                className={"w-full"}
                disabled={!peer || isAdding || !permission.networks.update}
                onClick={addExistingPeer}
              >
                <PlusCircle size={16} />
                Add Routing Peer
              </Button>
            </>
          ) : setup.setupKey || setup.isPreparing ? (
            <RoutingPeerInstall
              method={method}
              hostname={hostname}
              setupKey={setup.setupKey}
              isPreparing={setup.isPreparing}
              group={setup.group}
              knownPeerIds={setup.knownPeerIds}
              showTitle={false}
            />
          ) : (
            <>
              <div>
                <Label>Name</Label>
                <HelpText>
                  The name the routing peer registers with in NetBird.
                </HelpText>
                <Input
                  placeholder={"e.g., router-berlin"}
                  value={hostname}
                  error={hostnameError}
                  onChange={(e) => setHostname(e.target.value)}
                />
              </div>
              <Button
                variant={"secondary"}
                className={"w-full"}
                disabled={
                  !hostname.trim() ||
                  !!hostnameError ||
                  !permission.networks.update ||
                  !permission.setup_keys?.create
                }
                onClick={() => void setup.prepare()}
              >
                <KeyRoundIcon size={16} />
                Generate Setup Key
              </Button>
            </>
          )}
        </>
      )}
    </section>
  );
};

/** Shown when both networks already route, so no setup is needed. */
export const ConnectedCallout = ({ text }: { text: string }) => (
  <Callout variant={"success"}>{text}</Callout>
);
