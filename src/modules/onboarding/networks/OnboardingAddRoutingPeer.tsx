import Button from "@components/Button";
import { Modal, ModalContent } from "@components/modal/Modal";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { CopyIcon, DownloadIcon, KeyRoundIcon } from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";
import { useGroups } from "@/contexts/GroupsProvider";
import { Group } from "@/interfaces/Group";
import { Network, NetworkRouter } from "@/interfaces/Network";
import { Peer } from "@/interfaces/Peer";
import { SetupKey } from "@/interfaces/SetupKey";
import { SetupModalContent } from "@/modules/setup-netbird-modal/SetupModal";

type Props = {
  network?: Network;
  peers?: Peer[];
  onRoutingPeerAdded: (peer: Peer) => void;
};

export const OnboardingAddRoutingPeer = ({
  network,
  peers,
  onRoutingPeerAdded,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [setupKey, setSetupKey] = useState<SetupKey>();
  const { groups } = useGroups();
  const setupKeyRequest = useApiCall<SetupKey>("/setup-keys", true);
  const groupRequest = useApiCall<Group>("/groups", true);
  const routerRequest = useApiCall<NetworkRouter>("/networks", true);

  /**
   * Generate a new setup key for the routing peer
   */
  const generateSetupKey = async () => {
    let routingPeerGroup = groups?.find(
      (group) => group.name === "Routing Peers",
    );
    if (!routingPeerGroup) {
      routingPeerGroup = await groupRequest.post({
        name: "Routing Peers",
      });
    }

    notify({
      title: "Setup Key Created",
      description: "Successfully copied to clipboard.",
      loadingMessage: "Generating setup key...",
      promise: setupKeyRequest
        .post({
          name: "Routing Peer (My First Network)",
          type: "one-off",
          expires_in: 24 * 60 * 60, // 1 day expiration
          revoked: false,
          auto_groups: routingPeerGroup ? [routingPeerGroup.id] : [],
          usage_limit: 1,
          ephemeral: false,
          allow_extra_dns_labels: false,
        })
        .then((setupKey) => {
          setSetupKey(setupKey);
          copySetupKey(setupKey.key);
        }),
    });
  };

  /**
   * Detect routing peer based on group and add it to the network
   */
  useEffect(() => {
    const routingPeer = peers?.find(
      (p) => p.groups?.some((g) => g.name === "Routing Peers"),
    );
    const hasNetworkRoutingPeer =
      network?.routers?.find((r) => r === routingPeer?.id) !== undefined;
    if (routingPeer && network && !hasNetworkRoutingPeer) {
      routerRequest
        .post(
          {
            peer: routingPeer.id,
            metric: 9999,
            masquerade: true,
            enabled: true,
          },
          `/${network.id}/routers`,
        )
        .then(() => {
          onRoutingPeerAdded(routingPeer);
        });
    }
  }, [network, peers]);

  /**
   * Copy the setup key to clipboard
   */
  const copySetupKey = async (key: string, showMessage = false) => {
    try {
      await navigator.clipboard.writeText(key || "");
      if (showMessage) {
        notify({
          title: "Setup Key Copied",
          description: "Successfully copied to clipboard.",
        });
      }
    } catch (e) {}
  };

  return (
    <div className={"relative flex flex-col h-full gap-4"}>
        <div>
            <h1 className={"text-xl text-center"}>
                Add a routing peer and get the traffic flowing
            </h1>
            <div
                className={
                    "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
                }
            >
                Think of a routing peer as a connector to your internal network.
                It runs NetBird and lets your remote devices access internal resources, while enforcing access control policies.
            </div>
            <div
                className={
                    "text-sm text-nb-gray-300 font-light mt-2 block text-center sm:px-4"
                }
            >
                Generate a setup key and install NetBird on that machine.
            </div>
        </div>

        <div
            className={cn(
                "relative block rounded-lg border border-nb-gray-900 px-5 py-3 transition-all",
                "flex justify-between items-center mt-3",
            )}
        >
            <div>
                <div className="text-nb-gray-100 font-normal text-sm text-left gap-2 flex items-center">
            <KeyRoundIcon size={12} />
            Setup-Key
          </div>
          <div className={"text-nb-gray-300 text-[0.8rem] text-left mt-0.5"}>
            {setupKey?.key || "Not yet generated"}
          </div>
        </div>
        {setupKey ? (
          <Button
            variant={"secondary"}
            onClick={() => copySetupKey(setupKey.key, true)}
          >
            <CopyIcon size={14} />
          </Button>
        ) : (
          <Button variant={"primary"} onClick={generateSetupKey} size={"xs"}>
            Generate Setup Key
          </Button>
        )}
      </div>

      <Button
        variant={"primary"}
        className={""}
        disabled={!setupKey}
        onClick={() => setOpen(true)}
      >
        <DownloadIcon size={16} />
        Install Routing Peer
      </Button>

      {setupKey && (
        <Modal open={open} onOpenChange={setOpen}>
          <ModalContent>
            <SetupModalContent
              hostname={"routing-peer"}
              title={"Install NetBird"}
              setupKey={setupKey.key}
            />
          </ModalContent>
        </Modal>
      )}
    </div>
  );
};
